from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_identifies_vanta_backend() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["service"] == "vanta-backend"


def test_frontend_contract_routes_are_registered() -> None:
    paths = app.openapi()["paths"]
    expected = {
        "/api/dashboard",
        "/api/orders",
        "/api/orders/{order_id}",
        "/api/drivers",
        "/api/drivers/{driver_id}",
        "/api/plans/active",
        "/api/plans/optimize",
        "/api/simulations/driver-delay",
        "/api/tasks/{task_id}/status",
    }
    assert expected <= set(paths)


def test_retired_civicmind_routes_are_not_registered() -> None:
    paths = app.openapi()["paths"]
    retired_fragments = ("/issues", "/departments", "/analyze-frame")
    assert not any(fragment in path for path in paths for fragment in retired_fragments)


def test_order_request_uses_camel_case_fields() -> None:
    order_schema = app.openapi()["components"]["schemas"]["OrderCreate"]
    assert "customerName" in order_schema["properties"]
    assert "windowStart" in order_schema["properties"]
    assert "serviceMinutes" in order_schema["properties"]
