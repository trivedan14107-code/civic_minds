export type Priority = "normal" | "high" | "urgent";
export type OrderStatus = "unassigned" | "assigned" | "in_progress" | "delivered" | "failed";
export type DriverStatus = "available" | "active" | "delayed" | "offline";
export type CustomerAvailability = "confirmed_available" | "pending_verification" | "unavailable_reschedule";

export interface Order {
  id: string;
  customerName: string;
  address: string;
  latitude: number;
  longitude: number;
  demand: number;
  serviceMinutes: number;
  windowStart: string;
  windowEnd: string;
  priority: Priority;
  deliveryInstructions: string;
  customerAvailability?: CustomerAvailability;
  status: OrderStatus;
  createdAt?: string;
}

export type OrderInput = Omit<Order, "id" | "status" | "createdAt">;

export interface Driver {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  shiftStart: string;
  shiftEnd: string;
  status: DriverStatus;
  currentDelayMinutes: number;
  createdAt?: string;
}

export type DriverInput = Omit<Driver, "id" | "currentDelayMinutes" | "createdAt">;

export interface PlanStop {
  taskId?: string;
  sequence: number;
  orderId: string;
  eta: string;
  status: string;
  instruction: string;
  customerAvailability?: CustomerAvailability;
}

export interface DriverRoute {
  driverId: string;
  color: string;
  distanceKm: number;
  estimatedMinutes: number;
  load: number;
  capacity: number;
  geometry: { type: "LineString"; coordinates: number[][] };
  stops: PlanStop[];
}

export interface PlanChange {
  orderId: string;
  fromDriverId?: string;
  toDriverId?: string;
  reason: string;
}

export interface Plan {
  id: string;
  version: number;
  status: string;
  reason: string;
  totalDistanceKm: number;
  estimatedMinutes: number;
  unassignedOrderIds: string[];
  routes: DriverRoute[];
  changes: PlanChange[];
  routingSource: string;
  createdAt?: string;
}

export interface Dashboard {
  metrics: {
    unassignedOrders: number;
    activeDrivers: number;
    onTimePercentage: number;
    totalDistanceKm: number;
  };
  orders: Order[];
  drivers: Driver[];
  activePlan: Plan | null;
  alerts: { id: string; level: "info" | "warning" | "critical"; message: string }[];
}
