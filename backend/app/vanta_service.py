import uuid
from datetime import datetime, timedelta, timezone

from .supabase_client import get_supabase
from .vanta_optimizer import optimize_deliveries
from .vanta_routing import get_matrix, get_route_geometry
from .vanta_schemas import DriverCreate, OrderCreate


def _seed_data():
    now = datetime.now()
    base_today = datetime(now.year, now.month, now.day, 0, 0, 0)

    def iso_time(hours: float) -> str:
        return (base_today + timedelta(hours=hours)).isoformat()

    drivers = [
        {
            "id": "DRV-001",
            "name": "Aarav",
            "latitude": 17.3850,
            "longitude": 78.4867,
            "capacity": 12,
            "shift_start": iso_time(9),
            "shift_end": iso_time(18),
            "status": "available",
            "current_delay_minutes": 0,
        },
        {
            "id": "DRV-002",
            "name": "Diya",
            "latitude": 17.3850,
            "longitude": 78.4867,
            "capacity": 10,
            "shift_start": iso_time(9),
            "shift_end": iso_time(18),
            "status": "available",
            "current_delay_minutes": 0,
        },
        {
            "id": "DRV-003",
            "name": "Kabir",
            "latitude": 17.3850,
            "longitude": 78.4867,
            "capacity": 14,
            "shift_start": iso_time(9),
            "shift_end": iso_time(18),
            "status": "available",
            "current_delay_minutes": 0,
        },
    ]

    orders = [
        {
            "id": "ORD-001",
            "customer_name": "Ananya",
            "address": "Abids",
            "latitude": 17.3930,
            "longitude": 78.4730,
            "demand": 2,
            "service_minutes": 10,
            "window_start": iso_time(10),
            "window_end": iso_time(13.5),
            "priority": "urgent",
            "delivery_instructions": "Deliver safely and confirm at the door.",
            "status": "unassigned",
        },
        {
            "id": "ORD-002",
            "customer_name": "Vihaan",
            "address": "Himayatnagar",
            "latitude": 17.4020,
            "longitude": 78.4850,
            "demand": 2,
            "service_minutes": 10,
            "window_start": iso_time(10.5),
            "window_end": iso_time(14.5),
            "priority": "normal",
            "delivery_instructions": "Deliver safely and confirm at the door.",
            "status": "unassigned",
        },
        {
            "id": "ORD-003",
            "customer_name": "Meera",
            "address": "Banjara Hills",
            "latitude": 17.4160,
            "longitude": 78.4380,
            "demand": 3,
            "service_minutes": 12,
            "window_start": iso_time(11),
            "window_end": iso_time(15.5),
            "priority": "high",
            "delivery_instructions": "Deliver safely and confirm at the door.",
            "status": "unassigned",
        },
        {
            "id": "ORD-004",
            "customer_name": "Arjun",
            "address": "Jubilee Hills",
            "latitude": 17.4310,
            "longitude": 78.4070,
            "demand": 4,
            "service_minutes": 15,
            "window_start": iso_time(11.5),
            "window_end": iso_time(16.5),
            "priority": "high",
            "delivery_instructions": "Deliver safely and confirm at the door.",
            "status": "unassigned",
        },
        {
            "id": "ORD-005",
            "customer_name": "Ishita",
            "address": "Begumpet",
            "latitude": 17.4440,
            "longitude": 78.4660,
            "demand": 2,
            "service_minutes": 10,
            "window_start": iso_time(10),
            "window_end": iso_time(14.5),
            "priority": "normal",
            "delivery_instructions": "Deliver safely and confirm at the door.",
            "status": "unassigned",
        },
        {
            "id": "ORD-006",
            "customer_name": "Rohan",
            "address": "Secunderabad",
            "latitude": 17.4399,
            "longitude": 78.4983,
            "demand": 3,
            "service_minutes": 12,
            "window_start": iso_time(10.5),
            "window_end": iso_time(15.5),
            "priority": "urgent",
            "delivery_instructions": "Deliver safely and confirm at the door.",
            "status": "unassigned",
        },
        {
            "id": "ORD-007",
            "customer_name": "Saanvi",
            "address": "Dilsukhnagar",
            "latitude": 17.3688,
            "longitude": 78.5247,
            "demand": 2,
            "service_minutes": 10,
            "window_start": iso_time(11),
            "window_end": iso_time(16.5),
            "priority": "normal",
            "delivery_instructions": "Deliver safely and confirm at the door.",
            "status": "unassigned",
        },
        {
            "id": "ORD-008",
            "customer_name": "Aditya",
            "address": "Mehdipatnam",
            "latitude": 17.3952,
            "longitude": 78.4405,
            "demand": 3,
            "service_minutes": 10,
            "window_start": iso_time(11.5),
            "window_end": iso_time(17),
            "priority": "normal",
            "delivery_instructions": "Deliver safely and confirm at the door.",
            "status": "unassigned",
        },
        {
            "id": "ORD-009",
            "customer_name": "Kavya",
            "address": "Ameerpet",
            "latitude": 17.4375,
            "longitude": 78.4482,
            "demand": 4,
            "service_minutes": 15,
            "window_start": iso_time(10.5),
            "window_end": iso_time(16),
            "priority": "high",
            "delivery_instructions": "Deliver safely and confirm at the door.",
            "status": "unassigned",
        },
        {
            "id": "ORD-010",
            "customer_name": "Reyansh",
            "address": "Koti",
            "latitude": 17.3859,
            "longitude": 78.4866,
            "demand": 2,
            "service_minutes": 8,
            "window_start": iso_time(9.5),
            "window_end": iso_time(14),
            "priority": "normal",
            "delivery_instructions": "Deliver safely and confirm at the door.",
            "status": "unassigned",
        },
    ]

    return {"drivers": drivers, "orders": orders, "plans": [], "tasks": []}


_MEMORY_DB = _seed_data()


def list_orders() -> list[dict]:
    sb = get_supabase()
    if sb:
        try:
            result = sb.table("vanta_orders").select("*").order("created_at").execute()
            if result.data is not None:
                return result.data
        except Exception:
            pass
    return _MEMORY_DB["orders"]


def get_order(order_id: str) -> dict | None:
    sb = get_supabase()
    if sb:
        try:
            result = sb.table("vanta_orders").select("*").eq("id", order_id).limit(1).execute()
            if result.data:
                return result.data[0]
        except Exception:
            pass
    return next((o for o in _MEMORY_DB["orders"] if o["id"] == order_id), None)


def create_order(payload: OrderCreate) -> dict:
    data = payload.model_dump(mode="json")
    data.update({"id": _id("ORD"), "status": "unassigned"})
    sb = get_supabase()
    if sb:
        try:
            result = sb.table("vanta_orders").insert(data).execute()
            if result.data:
                return result.data[0]
        except Exception:
            pass
    _MEMORY_DB["orders"].append(data)
    return data


def notify_customer(order_id: str) -> dict:
    order = get_order(order_id)
    if not order:
        raise VantaError("ORDER_NOT_FOUND", "The requested order does not exist.")

    order["customer_availability"] = "pending_verification"
    sb = get_supabase()
    if sb:
        try:
            sb.table("vanta_orders").update({"customer_availability": "pending_verification"}).eq("id", order_id).execute()
        except Exception:
            pass

    msg = f"AI Pre-Delivery SMS sent to {order['customer_name']} ({order['address']}). Awaiting confirmation."
    return {
        "success": True,
        "message": msg,
        "availability": "pending_verification",
        "order_id": order_id,
    }


def update_customer_availability(order_id: str, availability: str) -> dict:
    order = get_order(order_id)
    if not order:
        raise VantaError("ORDER_NOT_FOUND", "The requested order does not exist.")

    order["customer_availability"] = availability
    sb = get_supabase()
    if sb:
        try:
            sb.table("vanta_orders").update({"customer_availability": availability}).eq("id", order_id).execute()
        except Exception:
            pass

    if availability == "unavailable_reschedule":
        active_plan = get_active_plan()
        if active_plan:
            try:
                build_plan(f"customer_unavailable:{order_id}")
            except Exception:
                pass

    return order



def list_drivers() -> list[dict]:
    sb = get_supabase()
    if sb:
        try:
            result = sb.table("vanta_drivers").select("*").order("name").execute()
            if result.data is not None:
                return result.data
        except Exception:
            pass
    return _MEMORY_DB["drivers"]


def get_driver(driver_id: str) -> dict | None:
    sb = get_supabase()
    if sb:
        try:
            result = sb.table("vanta_drivers").select("*").eq("id", driver_id).limit(1).execute()
            if result.data:
                return result.data[0]
        except Exception:
            pass
    return next((d for d in _MEMORY_DB["drivers"] if d["id"] == driver_id), None)


def create_driver(payload: DriverCreate) -> dict:
    data = payload.model_dump(mode="json")
    data.update({"id": _id("DRV"), "current_delay_minutes": 0})
    sb = get_supabase()
    if sb:
        try:
            result = sb.table("vanta_drivers").insert(data).execute()
            if result.data:
                return result.data[0]
        except Exception:
            pass
    _MEMORY_DB["drivers"].append(data)
    return data


def get_active_plan() -> dict | None:
    sb = get_supabase()
    if sb:
        try:
            result = (
                sb.table("vanta_plans")
                .select("*")
                .eq("status", "active")
                .order("version", desc=True)
                .limit(1)
                .execute()
            )
            if result.data:
                return result.data[0]
        except Exception:
            pass
    active_plans = [p for p in _MEMORY_DB["plans"] if p["status"] == "active"]
    if active_plans:
        return max(active_plans, key=lambda x: x["version"])
    return None


def build_plan(reason: str) -> dict:
    sb = get_supabase()
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
    version = (previous_plan["version"] + 1) if previous_plan else 1

    if previous_plan:
        if sb:
            try:
                sb.table("vanta_plans").update({"status": "superseded"}).eq("id", previous_plan["id"]).execute()
            except Exception:
                pass
        for p in _MEMORY_DB["plans"]:
            if p["id"] == previous_plan["id"]:
                p["status"] = "superseded"

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

    if sb:
        try:
            sb.table("vanta_plans").insert(plan_data).execute()
        except Exception:
            pass
    _MEMORY_DB["plans"].append(plan_data)

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
        if sb:
            try:
                sb.table("vanta_tasks").insert(task_rows).execute()
            except Exception:
                pass
        _MEMORY_DB["tasks"].extend(task_rows)

    assigned_ids = set(current_assignments)
    for order in _MEMORY_DB["orders"]:
        if order["id"] in [o["id"] for o in orders]:
            status = "assigned" if order["id"] in assigned_ids else "unassigned"
            if order.get("status") != "in_progress":
                order["status"] = status
                if sb:
                    try:
                        sb.table("vanta_orders").update({"status": status}).eq("id", order["id"]).execute()
                    except Exception:
                        pass

    active_driver_ids = {route["driver_id"] for route in optimized.routes}
    for driver in _MEMORY_DB["drivers"]:
        if driver["id"] in [d["id"] for d in drivers]:
            status = "active" if driver["id"] in active_driver_ids else "available"
            if int(driver.get("current_delay_minutes") or 0) > 0:
                status = "delayed"
            driver["status"] = status
            if sb:
                try:
                    sb.table("vanta_drivers").update({"status": status}).eq("id", driver["id"]).execute()
                except Exception:
                    pass

    return plan_data


def simulate_driver_delay(driver_id: str, delay_minutes: int) -> dict:
    driver = get_driver(driver_id)
    if not driver:
        raise VantaError("DRIVER_NOT_FOUND", "The selected driver does not exist.")
    driver["status"] = "delayed"
    driver["current_delay_minutes"] = delay_minutes
    sb = get_supabase()
    if sb:
        try:
            sb.table("vanta_drivers").update(
                {"status": "delayed", "current_delay_minutes": delay_minutes}
            ).eq("id", driver_id).execute()
        except Exception:
            pass
    return build_plan(f"driver_delay:{driver_id}:{delay_minutes}")


def update_task_status(
    task_id: str,
    status: str,
    latitude: float | None,
    longitude: float | None,
) -> dict:
    sb = get_supabase()
    task = next((t for t in _MEMORY_DB["tasks"] if t["id"] == task_id), None)
    if sb and not task:
        try:
            res = sb.table("vanta_tasks").select("*").eq("id", task_id).limit(1).execute()
            if res.data:
                task = res.data[0]
        except Exception:
            pass
    if not task:
        raise VantaError("TASK_NOT_FOUND", "The selected task does not exist.")

    task["status"] = status
    if status == "completed":
        task["completed_at"] = datetime.now(timezone.utc).isoformat()

    if sb:
        try:
            updates: dict = {"status": status}
            if status == "completed":
                updates["completed_at"] = task["completed_at"]
            sb.table("vanta_tasks").update(updates).eq("id", task_id).execute()
        except Exception:
            pass

    order_status = {"assigned": "assigned", "in_progress": "in_progress", "completed": "delivered", "failed": "failed"}[status]
    order = next((o for o in _MEMORY_DB["orders"] if o["id"] == task["order_id"]), None)
    if order:
        order["status"] = order_status
    if sb:
        try:
            sb.table("vanta_orders").update({"status": order_status}).eq("id", task["order_id"]).execute()
        except Exception:
            pass

    if latitude is not None and longitude is not None:
        drv = next((d for d in _MEMORY_DB["drivers"] if d["id"] == task["driver_id"]), None)
        if drv:
            drv["latitude"] = latitude
            drv["longitude"] = longitude
        if sb:
            try:
                sb.table("vanta_drivers").update(
                    {"latitude": latitude, "longitude": longitude}
                ).eq("id", task["driver_id"]).execute()
            except Exception:
                pass

    return task


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
    sb = get_supabase()
    if sb:
        try:
            result = sb.table("vanta_tasks").select("order_id,driver_id").eq("status", "in_progress").execute()
            if result.data:
                return {row["order_id"]: row["driver_id"] for row in result.data}
        except Exception:
            pass
    return {t["order_id"]: t["driver_id"] for t in _MEMORY_DB["tasks"] if t["status"] == "in_progress"}


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
