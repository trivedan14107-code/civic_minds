from datetime import datetime, timedelta, timezone

from app.vanta_optimizer import optimize_deliveries
from app.vanta_routing import MatrixResult


def _driver(driver_id: str, capacity: int = 2) -> dict:
    start = datetime(2026, 9, 26, 9, tzinfo=timezone.utc)
    return {
        "id": driver_id,
        "capacity": capacity,
        "shift_start": start,
        "shift_end": start + timedelta(hours=8),
        "current_delay_minutes": 0,
    }


def _order(order_id: str) -> dict:
    start = datetime(2026, 9, 26, 9, tzinfo=timezone.utc)
    return {
        "id": order_id,
        "demand": 1,
        "service_minutes": 5,
        "window_start": start,
        "window_end": start + timedelta(hours=6),
        "priority": "normal",
    }


def test_optimizer_assigns_orders_without_exceeding_capacity() -> None:
    drivers = [_driver("DRV-1"), _driver("DRV-2")]
    orders = [_order("ORD-1"), _order("ORD-2"), _order("ORD-3")]
    node_count = len(drivers) + len(orders)
    distances = [[0 if row == col else 1000 for col in range(node_count)] for row in range(node_count)]
    durations = [[0 if row == col else 300 for col in range(node_count)] for row in range(node_count)]

    result = optimize_deliveries(
        drivers,
        orders,
        MatrixResult(distances, durations, "test"),
        time_limit_seconds=1,
    )

    assert result.unassigned_order_ids == []
    assert sum(route["load"] for route in result.routes) == 3
    assert all(route["load"] <= route["capacity"] for route in result.routes)


def test_optimizer_reports_orders_unassigned_without_drivers() -> None:
    orders = [_order("ORD-1")]
    result = optimize_deliveries([], orders, MatrixResult([], [], "test"))
    assert result.unassigned_order_ids == ["ORD-1"]
