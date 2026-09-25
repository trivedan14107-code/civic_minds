from fastapi import APIRouter, HTTPException

from . import vanta_service
from .vanta_schemas import (
    Dashboard,
    DelaySimulationRequest,
    Driver,
    DriverCreate,
    OptimizeRequest,
    Order,
    OrderCreate,
    Plan,
    TaskStatusUpdate,
)


router = APIRouter(prefix="/api", tags=["VANTA"])


@router.get("/dashboard", response_model=Dashboard)
def get_dashboard() -> dict:
    return vanta_service.dashboard()


@router.get("/orders", response_model=list[Order])
def orders() -> list[dict]:
    return vanta_service.list_orders()


@router.post("/orders", response_model=Order, status_code=201)
def create_order(payload: OrderCreate) -> dict:
    return vanta_service.create_order(payload)


@router.get("/orders/{order_id}", response_model=Order)
def order(order_id: str) -> dict:
    result = vanta_service.get_order(order_id)
    if not result:
        raise _error(404, "ORDER_NOT_FOUND", "The selected order does not exist.")
    return result


@router.get("/drivers", response_model=list[Driver])
def drivers() -> list[dict]:
    return vanta_service.list_drivers()


@router.post("/drivers", response_model=Driver, status_code=201)
def create_driver(payload: DriverCreate) -> dict:
    return vanta_service.create_driver(payload)


@router.get("/drivers/{driver_id}", response_model=Driver)
def driver(driver_id: str) -> dict:
    result = vanta_service.get_driver(driver_id)
    if not result:
        raise _error(404, "DRIVER_NOT_FOUND", "The selected driver does not exist.")
    return result


@router.get("/plans/active", response_model=Plan | None)
def active_plan() -> dict | None:
    return vanta_service.get_active_plan()


@router.post("/plans/optimize", response_model=Plan)
def optimize(payload: OptimizeRequest) -> dict:
    try:
        return vanta_service.build_plan(payload.reason)
    except vanta_service.VantaError as exc:
        raise _error(409, exc.code, exc.message) from exc


@router.post("/simulations/driver-delay", response_model=Plan)
def simulate_delay(payload: DelaySimulationRequest) -> dict:
    try:
        return vanta_service.simulate_driver_delay(payload.driver_id, payload.delay_minutes)
    except vanta_service.VantaError as exc:
        status = 404 if exc.code == "DRIVER_NOT_FOUND" else 409
        raise _error(status, exc.code, exc.message) from exc


@router.patch("/tasks/{task_id}/status")
def update_task(task_id: str, payload: TaskStatusUpdate) -> dict:
    try:
        return vanta_service.update_task_status(
            task_id,
            payload.status,
            payload.latitude,
            payload.longitude,
        )
    except vanta_service.VantaError as exc:
        raise _error(404, exc.code, exc.message) from exc


def _error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})
