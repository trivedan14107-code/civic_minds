from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


Priority = Literal["normal", "high", "urgent"]
OrderStatus = Literal["unassigned", "assigned", "in_progress", "delivered", "failed"]
DriverStatus = Literal["available", "active", "delayed", "offline"]


class OrderCreate(CamelModel):
    customer_name: str = Field(min_length=1, max_length=120)
    address: str = Field(min_length=1, max_length=300)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    demand: int = Field(default=1, ge=1, le=100)
    service_minutes: int = Field(default=10, ge=1, le=240)
    window_start: datetime
    window_end: datetime
    priority: Priority = "normal"
    delivery_instructions: str = Field(default="Deliver safely and confirm at the door.", max_length=500)

    @model_validator(mode="after")
    def validate_window(self) -> "OrderCreate":
        if self.window_end <= self.window_start:
            raise ValueError("windowEnd must be after windowStart")
        return self


class Order(OrderCreate):
    id: str
    status: OrderStatus = "unassigned"
    created_at: datetime | None = None


class DriverCreate(CamelModel):
    name: str = Field(min_length=1, max_length=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    capacity: int = Field(default=10, ge=1, le=1000)
    shift_start: datetime
    shift_end: datetime
    status: DriverStatus = "available"

    @model_validator(mode="after")
    def validate_shift(self) -> "DriverCreate":
        if self.shift_end <= self.shift_start:
            raise ValueError("shiftEnd must be after shiftStart")
        return self


class Driver(DriverCreate):
    id: str
    current_delay_minutes: int = 0
    created_at: datetime | None = None


class OptimizeRequest(CamelModel):
    reason: str = Field(default="initial_plan", min_length=1, max_length=120)


class DelaySimulationRequest(CamelModel):
    driver_id: str
    delay_minutes: int = Field(gt=0, le=240)


class TaskStatusUpdate(CamelModel):
    status: Literal["assigned", "in_progress", "completed", "failed"]
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class PlanStop(CamelModel):
    task_id: str | None = None
    sequence: int
    order_id: str
    eta: datetime
    status: str
    instruction: str = "Confirm the recipient and complete proof of delivery."


class RouteGeometry(CamelModel):
    type: Literal["LineString"] = "LineString"
    coordinates: list[list[float]]


class DriverRoute(CamelModel):
    driver_id: str
    color: str
    distance_km: float
    estimated_minutes: int
    load: int
    capacity: int
    geometry: RouteGeometry
    stops: list[PlanStop]


class PlanChange(CamelModel):
    order_id: str
    from_driver_id: str | None = None
    to_driver_id: str | None = None
    reason: str


class Plan(CamelModel):
    id: str
    version: int
    status: str
    reason: str
    total_distance_km: float
    estimated_minutes: int
    unassigned_order_ids: list[str]
    routes: list[DriverRoute]
    changes: list[PlanChange]
    routing_source: str
    created_at: datetime | None = None


class DashboardMetrics(CamelModel):
    unassigned_orders: int
    active_drivers: int
    on_time_percentage: float
    total_distance_km: float


class Alert(CamelModel):
    id: str
    level: Literal["info", "warning", "critical"]
    message: str


class Dashboard(CamelModel):
    metrics: DashboardMetrics
    orders: list[Order]
    drivers: list[Driver]
    active_plan: Plan | None
    alerts: list[Alert]


class ApiErrorDetail(CamelModel):
    code: str
    message: str
