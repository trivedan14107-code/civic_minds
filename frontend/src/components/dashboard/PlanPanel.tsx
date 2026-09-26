import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Bot, CheckCircle2, Clock3, MapPin, Route, UserX } from "lucide-react";
import { useState } from "react";
import type { Driver, Plan } from "../../lib/types";
import { api } from "../../lib/api";
import StatusBadge from "../StatusBadge";

interface Props {
  plan: Plan | null;
  drivers: Driver[];
  selectedDriverId: string | null;
  onSelect: (id: string | null) => void;
  orders?: any[];
}

export default function PlanPanel({ plan, drivers, selectedDriverId, onSelect, orders = [] }: Props) {
  const queryClient = useQueryClient();
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  const notifyMutation = useMutation({
    mutationFn: (orderId: string) => api.notifyCustomer(orderId),
    onSuccess: (res) => {
      setActiveNotice(res.message);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ orderId, availability }: { orderId: string; availability: "confirmed_available" | "unavailable_reschedule" }) =>
      api.updateAvailability(orderId, availability),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (!plan) {
    return (
      <div className="panel p-5">
        <div className="panel-title">Active plan</div>
        <div className="mt-8 text-center text-sm text-slate-500">
          <Route className="mx-auto mb-3 text-slate-600" size={32} />
          Generate a plan to assign and sequence deliveries.
        </div>
      </div>
    );
  }

  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const activeRoute = plan.routes.find((r) => r.driverId === selectedDriverId);

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="panel-title">Active plan</div>
          <div className="mt-1 font-bold">Version {plan.version}</div>
        </div>
        <StatusBadge value={plan.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-black/15 p-3">
          <span className="text-slate-500">ETA total</span>
          <div className="mt-1 flex items-center gap-1.5 font-bold">
            <Clock3 size={14} className="text-cyan" />
            {plan.estimatedMinutes} min
          </div>
        </div>
        <div className="rounded-xl bg-black/15 p-3">
          <span className="text-slate-500">Routing engine</span>
          <div className="mt-1 truncate font-bold text-lime">{plan.routingSource.replace("_", " ")}</div>
        </div>
      </div>

      {activeNotice && (
        <div className="rounded-xl border border-lime/30 bg-lime/10 p-3 text-xs text-lime">
          {activeNotice}
        </div>
      )}

      {/* Driver selector list */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Driver Route</div>
        <button
          onClick={() => onSelect(null)}
          className={`w-full rounded-xl border p-3 text-left text-sm transition ${
            selectedDriverId === null ? "border-lime/50 bg-lime/10 text-lime font-bold" : "border-line hover:border-slate-600"
          }`}
        >
          🌐 All Driver Routes ({plan.routes.length})
        </button>

        {plan.routes.map((route) => {
          const driver = drivers.find((item) => item.id === route.driverId);
          const isSelected = selectedDriverId === route.driverId;
          return (
            <button
              key={route.driverId}
              onClick={() => onSelect(route.driverId)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                isSelected ? "border-lime/50 bg-lime/10" : "border-line hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <i className="h-3 w-3 rounded-full" style={{ background: route.color }} />
                  {driver?.name || route.driverId}
                </span>
                <span className="text-xs font-bold text-slate-400">{route.stops.length} stops</span>
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>{route.distanceKm.toFixed(1)} km distance</span>
                <span>
                  {route.load}/{route.capacity} capacity
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sequence of stops and detailed instructions for selected driver or all */}
      {selectedDriverId && activeRoute && (
        <div className="space-y-3 pt-3 border-t border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-lime">
              Stop Sequence ({activeRoute.stops.length} stops)
            </span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {activeRoute.stops.map((stop) => {
              const orderDetails = orderMap.get(stop.orderId);
              const isUnavailable = orderDetails?.customerAvailability === "unavailable_reschedule";
              const isPending = orderDetails?.customerAvailability === "pending_verification";

              return (
                <div
                  key={stop.orderId}
                  className={`rounded-xl border p-3.5 space-y-2 text-xs transition ${
                    isUnavailable
                      ? "border-rose-500/40 bg-rose-500/10"
                      : isPending
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-line bg-black/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-ink font-black text-[11px]">
                        {stop.sequence}
                      </span>
                      <div>
                        <div className="font-extrabold text-white text-sm">
                          {orderDetails?.customerName || stop.orderId}
                        </div>
                        <div className="text-slate-400 flex items-center gap-1">
                          <MapPin size={12} className="text-cyan" />
                          {orderDetails?.address || stop.orderId}
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-cyan">
                      ETA {new Date(stop.eta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Detailed Instructions */}
                  <div className="rounded-lg bg-black/30 p-2.5 border border-white/5 space-y-1">
                    <div className="text-[11px] font-bold text-cyan flex items-center gap-1">
                      <Bot size={13} /> Detailed Delivery Instructions:
                    </div>
                    <div className="whitespace-pre-line text-slate-200 text-xs leading-relaxed font-medium">
                      {stop.instruction}
                    </div>

                  </div>

                  {/* Customer Availability Status & Action */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="text-[11px]">
                      {isUnavailable ? (
                        <span className="inline-flex items-center gap-1 text-rose-300 font-bold">
                          <UserX size={13} /> Customer Unavailable (Rescheduled)
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                          <Bell size={13} /> AI Notification Pending Response
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                          <CheckCircle2 size={13} /> Confirmed Available
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        title="Send pre-delivery message to customer"
                        disabled={notifyMutation.isPending}
                        onClick={() => notifyMutation.mutate(stop.orderId)}
                        className="rounded-lg border border-cyan/40 bg-cyan/10 px-2 py-1 text-[10px] font-bold text-cyan hover:bg-cyan/20"
                      >
                        <Bell size={11} className="inline mr-1" />
                        Send AI SMS
                      </button>
                      {isUnavailable ? (
                        <button
                          title="Mark Customer as Available"
                          disabled={availabilityMutation.isPending}
                          onClick={() =>
                            availabilityMutation.mutate({ orderId: stop.orderId, availability: "confirmed_available" })
                          }
                          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/20"
                        >
                          Mark Available
                        </button>
                      ) : (
                        <button
                          title="Flag Customer as Unavailable to trigger re-plan"
                          disabled={availabilityMutation.isPending}
                          onClick={() =>
                            availabilityMutation.mutate({ orderId: stop.orderId, availability: "unavailable_reschedule" })
                          }
                          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-300 hover:bg-rose-500/20"
                        >
                          Flag Unavailable
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
