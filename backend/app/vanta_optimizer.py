from dataclasses import dataclass
from datetime import datetime, timedelta

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

from .vanta_routing import MatrixResult


ROUTE_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c", "#0891b2"]
DROP_PENALTY = {"normal": 100_000, "high": 500_000, "urgent": 1_000_000}


@dataclass
class OptimizationResult:
    routes: list[dict]
    unassigned_order_ids: list[str]
    total_distance_km: float
    estimated_minutes: int


def optimize_deliveries(
    drivers: list[dict],
    orders: list[dict],
    matrix: MatrixResult,
    locked_assignments: dict[str, str] | None = None,
    time_limit_seconds: int = 3,
) -> OptimizationResult:
    if not drivers:
        return OptimizationResult([], [order["id"] for order in orders], 0.0, 0)
    if not orders:
        return OptimizationResult([], [], 0.0, 0)

    locked_assignments = locked_assignments or {}
    driver_count = len(drivers)
    node_count = driver_count + len(orders)
    if len(matrix.distances_meters) != node_count:
        raise ValueError("Routing matrix size does not match drivers and orders")

    base_time = min(_as_datetime(driver["shift_start"]) for driver in drivers)
    horizon_minutes = max(
        24 * 60,
        max(_minutes_from(base_time, _as_datetime(driver["shift_end"])) for driver in drivers) + 240,
    )
    starts = list(range(driver_count))
    manager = pywrapcp.RoutingIndexManager(node_count, driver_count, starts, starts)
    routing = pywrapcp.RoutingModel(manager)

    service_minutes = [0] * driver_count + [int(order["service_minutes"]) for order in orders]
    demands = [0] * driver_count + [int(order["demand"]) for order in orders]

    def distance_callback(from_index: int, to_index: int) -> int:
        return matrix.distances_meters[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

    distance_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(distance_callback_index)

    def time_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        travel_minutes = int(round(matrix.durations_seconds[from_node][to_node] / 60))
        return service_minutes[from_node] + travel_minutes

    time_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.AddDimension(time_callback_index, 30, horizon_minutes, False, "Time")
    time_dimension = routing.GetDimensionOrDie("Time")

    for driver_index, driver in enumerate(drivers):
        shift_start = _minutes_from(base_time, _as_datetime(driver["shift_start"]))
        shift_start += int(driver.get("current_delay_minutes") or 0)
        shift_end = _minutes_from(base_time, _as_datetime(driver["shift_end"]))
        time_dimension.CumulVar(routing.Start(driver_index)).SetRange(max(0, shift_start), shift_end)
        time_dimension.CumulVar(routing.End(driver_index)).SetRange(max(0, shift_start), shift_end)

    for order_offset, order in enumerate(orders):
        node = driver_count + order_offset
        index = manager.NodeToIndex(node)
        window_start = max(0, _minutes_from(base_time, _as_datetime(order["window_start"])))
        window_end = min(horizon_minutes, _minutes_from(base_time, _as_datetime(order["window_end"])))
        if window_end < window_start:
            window_end = window_start
        time_dimension.CumulVar(index).SetRange(window_start, window_end)
        routing.AddDisjunction([index], DROP_PENALTY.get(order.get("priority", "normal"), 100_000))

    def demand_callback(from_index: int) -> int:
        return demands[manager.IndexToNode(from_index)]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,
        [int(driver["capacity"]) for driver in drivers],
        True,
        "Capacity",
    )

    driver_index_by_id = {driver["id"]: index for index, driver in enumerate(drivers)}
    order_index_by_id = {order["id"]: index for index, order in enumerate(orders)}
    for order_id, driver_id in locked_assignments.items():
        if order_id not in order_index_by_id or driver_id not in driver_index_by_id:
            continue
        node = driver_count + order_index_by_id[order_id]
        routing.VehicleVar(manager.NodeToIndex(node)).SetValue(driver_index_by_id[driver_id])

    search = pywrapcp.DefaultRoutingSearchParameters()
    search.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search.time_limit.seconds = time_limit_seconds
    search.log_search = False
    solution = routing.SolveWithParameters(search)
    if solution is None:
        return OptimizationResult([], [order["id"] for order in orders], 0.0, 0)

    assigned_order_ids: set[str] = set()
    routes: list[dict] = []
    total_distance_meters = 0
    maximum_route_minutes = 0

    for driver_index, driver in enumerate(drivers):
        route_stops: list[dict] = []
        route_nodes: list[int] = [driver_index]
        route_distance_meters = 0
        route_load = 0
        index = routing.Start(driver_index)
        route_start_minutes = solution.Value(time_dimension.CumulVar(index))

        while not routing.IsEnd(index):
            next_index = solution.Value(routing.NextVar(index))
            from_node = manager.IndexToNode(index)
            to_node = manager.IndexToNode(next_index)
            route_distance_meters += matrix.distances_meters[from_node][to_node]
            if to_node >= driver_count:
                order = orders[to_node - driver_count]
                assigned_order_ids.add(order["id"])
                route_load += int(order["demand"])
                eta_minutes = solution.Value(time_dimension.CumulVar(next_index))
                route_stops.append(
                    {
                        "sequence": len(route_stops) + 1,
                        "order_id": order["id"],
                        "eta": base_time + timedelta(minutes=eta_minutes),
                        "status": "assigned",
                    }
                )
            route_nodes.append(to_node)
            index = next_index

        route_end_minutes = solution.Value(time_dimension.CumulVar(index))
        route_minutes = max(0, route_end_minutes - route_start_minutes)
        maximum_route_minutes = max(maximum_route_minutes, route_minutes)
        total_distance_meters += route_distance_meters
        if route_stops:
            routes.append(
                {
                    "driver_id": driver["id"],
                    "color": ROUTE_COLORS[driver_index % len(ROUTE_COLORS)],
                    "distance_km": round(route_distance_meters / 1000, 2),
                    "estimated_minutes": route_minutes,
                    "load": route_load,
                    "capacity": int(driver["capacity"]),
                    "node_indices": route_nodes,
                    "stops": route_stops,
                }
            )

    unassigned = [order["id"] for order in orders if order["id"] not in assigned_order_ids]
    return OptimizationResult(
        routes=routes,
        unassigned_order_ids=unassigned,
        total_distance_km=round(total_distance_meters / 1000, 2),
        estimated_minutes=maximum_route_minutes,
    )


def _as_datetime(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _minutes_from(base_time: datetime, value: datetime) -> int:
    return int((value - base_time).total_seconds() // 60)
