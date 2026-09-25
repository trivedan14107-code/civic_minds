import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Bot, CheckCircle2, ChevronLeft, Clock3, MapPin, Navigation, Play, TriangleAlert, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorPanel, Loading } from "../components/Feedback";
import StatusBadge from "../components/StatusBadge";
import OperationsMap from "../components/map/OperationsMap";
import { useDashboard } from "../hooks/useDashboard";
import { api, errorMessage } from "../lib/api";

export default function DriverPage() {
  const { driverId } = useParams();
  const dashboard = useDashboard();
  const client = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () => client.invalidateQueries({ queryKey: ["dashboard"] });

  const taskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: "in_progress" | "completed" }) => api.updateTask(taskId, status),
    onSuccess: refresh,
  });

  const delayMutation = useMutation({
    mutationFn: () => api.simulateDelay(driverId!, 30),
    onSuccess: () => {
      setNotice("Reported 30 min delay. VANTA AI re-planned remaining stops.");
      refresh();
    },
  });

  const notifyMutation = useMutation({
    mutationFn: (orderId: string) => api.notifyCustomer(orderId),
    onSuccess: (res) => {
      setNotice(res.message);
      refresh();
    },
  });

  if (dashboard.isLoading) return <Loading label="Loading assigned route…" />;
  if (dashboard.isError || !dashboard.data) return <ErrorPanel message={errorMessage(dashboard.error)} retry={() => dashboard.refetch()} />;

  const driver = dashboard.data.drivers.find((d) => d.id === driverId);
  if (!driver) return <ErrorPanel message="Selected driver profile does not exist." />;

  const route = dashboard.data.activePlan?.routes.find((r) => r.driverId === driverId);
  const orders = new Map(dashboard.data.orders.map((o) => [o.id, o]));
  const next = route?.stops.find((s) => s.status !== "completed");
  const nextOrder = next ? orders.get(next.orderId) : null;

  return (
    <div className="mx-auto min-h-screen max-w-3xl space-y-4">
      <Link to="/driver-portal" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition">
        <ChevronLeft size={16} /> Back to Driver Selection
      </Link>

      {/* Single Driver Profile Lock Header */}
      <header className="panel overflow-hidden border-lime/30">
        <div className="bg-gradient-to-br from-lime/15 via-cyan/5 to-slate-900/40 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-lime/20 px-2 py-0.5 text-[10px] font-black uppercase text-lime">Active Driver Profile</span>
                <span className="text-xs text-slate-400">ID: {driver.id}</span>
              </div>
              <h1 className="mt-2 text-3xl font-black">{driver.name}</h1>
            </div>
            <StatusBadge value={driver.status} />
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-300">
            <span>📦 {route?.stops.length || 0} Total Stops</span>
            <span>🛣️ {route?.distanceKm.toFixed(1) || "0.0"} km Total Route</span>
            <span>⏱️ ~{route?.estimatedMinutes || 0} min Route Time</span>
            <span>🚛 Load: {route?.load || 0}/{driver.capacity} Units</span>
          </div>
        </div>
      </header>

      {notice && (
        <div className="rounded-xl border border-lime/30 bg-lime/10 p-3 text-xs text-lime">
          {notice}
        </div>
      )}

      {/* Map showing ONLY this driver's single route & stops */}
      <div className="panel p-2">
        <OperationsMap
          orders={dashboard.data.orders}
          drivers={[driver]}
          plan={dashboard.data.activePlan}
          selectedDriverId={driver.id}
          className="h-[320px] sm:h-[400px]"
        />
      </div>

      {/* Next Stop Card with Detailed Instructions & AI Pre-Delivery Customer Notification */}
      {next ? (
        <section className="panel border-lime/40 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-lime px-3 py-1 text-xs font-black text-ink">
              CURRENT STOP #{next.sequence}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan">
              <Clock3 size={15} />
              ETA {new Date(next.eta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">{nextOrder?.address || next.orderId}</h2>
            <div className="mt-1 text-xs text-slate-400 font-semibold">
              Recipient: <strong className="text-slate-200">{nextOrder?.customerName}</strong> · Demand: {nextOrder?.demand} unit(s) · Priority:{" "}
              <span className="uppercase text-lime">{nextOrder?.priority}</span>
            </div>
          </div>

          {/* AI Customer Availability Verification */}
          <div className="rounded-xl border border-cyan/20 bg-cyan/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan">
                <Bot size={16} /> AI Customer Pre-Delivery Notice
              </div>
              <button
                disabled={notifyMutation.isPending}
                onClick={() => notifyMutation.mutate(next.orderId)}
                className="rounded-lg border border-cyan/40 bg-cyan/20 px-2.5 py-1 text-xs font-bold text-cyan hover:bg-cyan/30"
              >
                <Bell size={13} className="inline mr-1" />
                Send AI Pre-Delivery SMS
              </button>
            </div>
            <div className="text-xs text-slate-300">
              {nextOrder?.customerAvailability === "unavailable_reschedule" ? (
                <span className="text-rose-300 font-bold inline-flex items-center gap-1">
                  <UserX size={14} /> Customer unavailable at scheduled location. VANTA AI will re-route.
                </span>
              ) : nextOrder?.customerAvailability === "pending_verification" ? (
                <span className="text-amber-300 font-bold inline-flex items-center gap-1">
                  <Bell size={14} /> AI SMS sent to {nextOrder?.customerName}. Awaiting arrival confirmation.
                </span>
              ) : (
                <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                  <UserCheck size={14} /> Customer confirmed available for delivery around {new Date(next.eta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
                </span>
              )}
            </div>
          </div>

          {/* Detailed Instructions */}
          <div className="rounded-xl border border-slate-700 bg-black/40 p-4 space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-lime flex items-center gap-1.5">
              📋 Detailed Delivery Instructions
            </div>
            <p className="text-sm leading-relaxed text-slate-100 font-medium">
              {nextOrder?.deliveryInstructions || next.instruction || "Deliver safely and confirm at the door."}
            </p>
          </div>

          {/* Stop Actions */}
          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            {next.taskId && (
              <>
                <button
                  className="button-secondary"
                  disabled={taskMutation.isPending}
                  onClick={() => taskMutation.mutate({ taskId: next.taskId!, status: "in_progress" })}
                >
                  <Play size={16} /> Start Delivery
                </button>
                <button
                  className="button-primary"
                  disabled={taskMutation.isPending}
                  onClick={() => taskMutation.mutate({ taskId: next.taskId!, status: "completed" })}
                >
                  <CheckCircle2 size={16} /> Complete Delivery
                </button>
              </>
            )}
            <a
              className="button-secondary sm:col-span-2 text-center"
              href={`https://www.openstreetmap.org/directions?to=${nextOrder?.latitude},${nextOrder?.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation size={16} /> Open Turn-by-Turn GPS Map
            </a>
          </div>
        </section>
      ) : (
        <section className="panel p-8 text-center space-y-3">
          <CheckCircle2 className="mx-auto text-lime" size={40} />
          <h2 className="text-xl font-black">All Stops Completed!</h2>
          <p className="text-xs text-slate-400">Great job, {driver.name}. No remaining stops on your active route.</p>
        </section>
      )}

      {(taskMutation.error || delayMutation.error) && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          {errorMessage(taskMutation.error || delayMutation.error)}
        </p>
      )}

      {/* Stop Sequence List with Detailed Instructions */}
      <section className="panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm uppercase tracking-wider text-slate-300">Route Stop Sequence</h2>
          <button
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200"
            disabled={delayMutation.isPending}
            onClick={() => delayMutation.mutate()}
          >
            <TriangleAlert size={15} />
            {delayMutation.isPending ? "Reporting…" : "Report 30 Min Delay"}
          </button>
        </div>

        <div className="space-y-3">
          {route?.stops.map((stop) => {
            const order = orders.get(stop.orderId);
            return (
              <div key={stop.orderId} className="rounded-xl border border-line bg-black/20 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-lime text-ink font-black text-xs">
                      {stop.sequence}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                        <MapPin size={13} className="text-cyan" />
                        {order?.address || stop.orderId}
                      </div>
                      <div className="text-[11px] text-slate-400">Recipient: {order?.customerName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-cyan text-xs">
                      ETA {new Date(stop.eta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <StatusBadge value={stop.status} />
                  </div>
                </div>

                {/* Detailed Instruction for each stop in sequence */}
                <div className="rounded-lg bg-black/40 p-2 text-slate-300 text-[11px] border border-white/5">
                  <strong className="text-cyan">Instruction:</strong>{" "}
                  {order?.deliveryInstructions || stop.instruction || "Deliver safely and confirm at the door."}
                </div>
              </div>
            );
          })}
          {!route?.stops.length && (
            <p className="py-6 text-center text-xs text-slate-500">No route sequence generated yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
