import uuid
from datetime import datetime, timezone

from .supabase_client import get_supabase
from .vanta_optimizer import optimize_deliveries
from .vanta_routing import get_matrix, get_route_geometry
from .vanta_schemas import DriverCreate, OrderCreate


def list_orders() -> list[dict]:
    result = get_supabase().table("vanta_orders").select("*").order("created_at").execute()
    return result.data or []


def get_order(order_id: str) -> dict | None:
    result = get_supabase().table("vanta_orders").select("*").eq("id", order_id).limit(1).execute()
    return result.data[0] if result.data else None


def create_order(payload: OrderCreate) -> dict:
    data = payload.model_dump(mode="json")
    data.update({"id": _id("ORD"), "status": "unassigned"})
    return get_supabase().table("vanta_orders").insert(data).select("*").single().execute().data


def list_drivers() -> list[dict]:
    result = get_supabase().table("vanta_drivers").select("*").order("name").execute()
    return result.data or []


def get_driver(driver_id: str) -> dict | None:
    result = get_supabase().table("vanta_drivers").select("*").eq("id", driver_id).limit(1).execute()
    return result.data[0] if result.data else None


def create_driver(payload: DriverCreate) -> dict:
    data = payload.model_dump(mode="json")
    data.update({"id": _id("DRV"), "current_delay_minutes": 0})
    return get_supabase().table("vanta_drivers").insert(data).select("*").single().execute().data


def get_active_plan() -> dict | None:
    result = (
        get_supabase()
        .table("vanta_plans")
        .select("*")
        .eq("status", "active")
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def build_plan(reason: str) -> dict:
    supabase = get_supabase()
    drivers = [driver for driver in list_drivers() if driver["status"] != "offline"]
    orders = [
        order
        for order in list_orders()
        if order["status"] not in {"delivered", "failed"}
    ]
    if not drivers:
        raise VantaError("NO_DRIVERS", "No available drivers can receive deliveries.")
    if not orders:
        raise VantaError("NO_ORDERS", "There are no unfinished orders to optimize.")

    coordinates = tuple(
        [(float(driver["latitude"]), float(driver["longitude"])) for driver in drivers]
        + [(float(order["latitude"]), float(order["longitude"])) for order in orders]
    )
    matrix = get_matrix(coordinates)
    locked_assignments = _in_progress_assignments()
    optimized = optimize_deliveries(drivers, orders, matrix, locked_assignments)
    if not optimized.routes and optimized.unassigned_order_ids:
        raise VantaError(
            "OPTIMIZATION_INFEASIBLE",
            "No feasible route fits the available capacities, shifts and delivery windows.",
        )

    previous_plan = get_active_plan()
    previous_assignments = _assignment_map(previous_plan)
    current_assignments: dict[str, str] = {}
    routing_sources = {matrix.source}
    plan_id = _id("PLAN")

    for route in optimized.routes:
        route_coordinates = [coordinates[node] for node in route.pop("node_indices")]
        geometry, geometry_source = get_route_geometry(route_coordinates)
        routing_sources.add(geometry_source)
        route["geometry"] = {"type": "LineString", "coordinates": geometry}
        for stop in route["stops"]:
            stop["task_id"] = _id("TASK")
            if isinstance(stop["eta"], datetime):
                stop["eta"] = stop["eta"].isoformat()
            current_assignments[stop["order_id"]] = route["driver_id"]

    changes = _plan_changes(previous_assignments, current_assignments)
    latest = supabase.table("vanta_plans").select("version").order("version", desc=True).limit(1).execute()
    version = int(latest.data[0]["version"]) + 1 if latest.data else 1
    if previous_plan:
        supabase.table("vanta_plans").update({"status": "superseded"}).eq(
            "id", previous_plan["id"]
        ).execute()

    routing_source = "openrouteservice" if routing_sources == {"openrouteservice"} else "haversine_fallback"
    plan_data = {
        "id": plan_id,
        "version": version,
        "status": "active",
        "reason": reason,
        "total_distance_km": optimized.total_distance_km,
        "estimated_minutes": optimized.estimated_minutes,
        "unassigned_order_ids": optimized.unassigned_order_ids,
        "routes": optimized.routes,
        "changes": changes,
        "routing_source": routing_source,
    }
    created = supabase.table("vanta_plans").insert(plan_data).select("*").single().execute().data

    task_rows = []
    for route in optimized.routes:
        for stop in route["stops"]:
            task_rows.append(
                {
                    "id": stop["task_id"],
                    "plan_id": plan_id,
                    "driver_id": route["driver_id"],
                    "order_id": stop["order_id"],
                    "sequence": stop["sequence"],
                    "eta": stop["eta"],
                    "status": "assigned",
                }
            )
    if task_rows:
        supabase.table("vanta_tasks").insert(task_rows).execute()

    assigned_ids = set(current_assignments)
    for order in orders:
        status = "assigned" if order["id"] in assigned_ids else "unassigned"
        if order["status"] != "in_progress":
            supabase.table("vanta_orders").update({"status": status}).eq("id", order["id"]).execute()
    active_driver_ids = {route["driver_id"] for route in optimized.routes}
    for driver in drivers:
        status = "active" if driver["id"] in active_driver_ids else "available"
        if int(driver.get("current_delay_minutes") or 0) > 0:
            status = "delayed"
        supabase.table("vanta_drivers").update({"status": status}).eq("id", driver["id"]).execute()
    return created


def simulate_driver_delay(driver_id: str, delay_minutes: int) -> dict:
    driver = get_driver(driver_id)
    if not driver:
        raise VantaError("DRIVER_NOT_FOUND", "The selected driver does not exist.")
    get_supabase().table("vanta_drivers").update(
        {"status": "delayed", "current_delay_minutes": delay_minutes}
    ).eq("id", driver_id).execute()
    return build_plan(f"driver_delay:{driver_id}:{delay_minutes}")


def update_task_status(
    task_id: str,
    status: str,
    latitude: float | None,
    longitude: float | None,
) -> dict:
    supabase = get_supabase()
    result = supabase.table("vanta_tasks").select("*").eq("id", task_id).limit(1).execute()
    if not result.data:
        raise VantaError("TASK_NOT_FOUND", "The selected task does not exist.")
    task = result.data[0]
    updates: dict = {"status": status}
    if status == "completed":
        updates["completed_at"] = datetime.now(timezone.utc).isoformat()
    updated = supabase.table("vanta_tasks").update(updates).eq("id", task_id).select("*").single().execute().data
    order_status = {"assigned": "assigned", "in_progress": "in_progress", "completed": "delivered", "failed": "failed"}[status]
    supabase.table("vanta_orders").update({"status": order_status}).eq("id", task["order_id"]).execute()
    if latitude is not None and longitude is not None:
        supabase.table("vanta_drivers").update(
            {"latitude": latitude, "longitude": longitude}
        ).eq("id", task["driver_id"]).execute()
    return updated


def dashboard() -> dict:
    orders = list_orders()
    drivers = list_drivers()
    active_plan = get_active_plan()
    unfinished = [order for order in orders if order["status"] not in {"delivered", "failed"}]
    assigned = [order for order in unfinished if order["status"] != "unassigned"]
    alerts = []
    for driver in drivers:
        if driver["status"] == "delayed":
            alerts.append(
                {
                    "id": f"delay-{driver['id']}",
                    "level": "warning",
                    "message": f"{driver['name']} is delayed by {driver['current_delay_minutes']} minutes.",
                }
            )
    return {
        "metrics": {
            "unassigned_orders": sum(order["status"] == "unassigned" for order in unfinished),
            "active_drivers": sum(driver["status"] in {"active", "delayed"} for driver in drivers),
            "on_time_percentage": round(100 * len(assigned) / len(unfinished), 1) if unfinished else 100.0,
            "total_distance_km": float(active_plan["total_distance_km"]) if active_plan else 0.0,
        },
        "orders": orders,
        "drivers": drivers,
        "active_plan": active_plan,
        "alerts": alerts,
    }


def _in_progress_assignments() -> dict[str, str]:
    result = get_supabase().table("vanta_tasks").select("order_id,driver_id").eq("status", "in_progress").execute()
    return {row["order_id"]: row["driver_id"] for row in result.data or []}


def _assignment_map(plan: dict | None) -> dict[str, str]:
    if not plan:
        return {}
    return {
        stop["order_id"]: route["driver_id"]
        for route in plan.get("routes", [])
        for stop in route.get("stops", [])
    }


def _plan_changes(previous: dict[str, str], current: dict[str, str]) -> list[dict]:
    changes = []
    for order_id, new_driver in current.items():
        old_driver = previous.get(order_id)
        if old_driver and old_driver != new_driver:
            changes.append(
                {
                    "order_id": order_id,
                    "from_driver_id": old_driver,
                    "to_driver_id": new_driver,
                    "reason": "Reassigned to avoid a predicted late delivery",
                }
            )
    return changes


def _id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


class VantaError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
