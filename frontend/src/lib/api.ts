import type { Dashboard, Driver, DriverInput, Order, OrderInput, Plan } from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("VANTA backend is offline. Start the API and try again.", 0);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail?.message || body?.detail || "The operation could not be completed.", response.status);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; service: string }>("/api/health"),
  dashboard: () => request<Dashboard>("/api/dashboard"),
  orders: () => request<Order[]>("/api/orders"),
  createOrder: (payload: OrderInput) => request<Order>("/api/orders", { method: "POST", body: JSON.stringify(payload) }),
  drivers: () => request<Driver[]>("/api/drivers"),
  createDriver: (payload: DriverInput) => request<Driver>("/api/drivers", { method: "POST", body: JSON.stringify(payload) }),
  activePlan: () => request<Plan | null>("/api/plans/active"),
  optimize: (reason = "initial_plan") => request<Plan>("/api/plans/optimize", { method: "POST", body: JSON.stringify({ reason }) }),
  simulateDelay: (driverId: string, delayMinutes: number) => request<Plan>("/api/simulations/driver-delay", { method: "POST", body: JSON.stringify({ driverId, delayMinutes }) }),
  updateTask: (taskId: string, status: "assigned" | "in_progress" | "completed" | "failed") =>
    request(`/api/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
