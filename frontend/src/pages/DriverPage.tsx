import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Bot, CheckCircle2, ChevronLeft, Clock3, MapPin, Navigation, Play, Sparkles, TriangleAlert, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorPanel, Loading } from "../components/Feedback";
import StatusBadge from "../components/StatusBadge";
import OperationsMap from "../components/map/OperationsMap";
import { useDashboard } from "../hooks/useDashboard";
import { api, errorMessage } from "../lib/api";

function RouteIconPlaceholder() {
  return <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cyan/10 text-cyan"><Sparkles size={22} /></div>;
}

export default function DriverPage() {
  const { driverId } = useParams();
  const dashboard = useDashboard();
  const client = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [journeyStarted, setJourneyStarted] = useState(() => sessionStorage.getItem(`vanta-journey-${driverId}`) === "started");

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

  const startJourneyMutation = useMutation({
    mutationFn: () => api.optimize("driver_started_journey"),
    onSuccess: () => {
      sessionStorage.setItem(`vanta-journey-${driverId}`, "started");
      setJourneyStarted(true);
      setNotice("VANTA evaluated your parcels and published the best delivery sequence.");
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

  const assignedRoute = dashboard.data.activePlan?.routes.find((r) => r.driverId === driverId);
  const route = journeyStarted ? assignedRoute : undefined;
  const orders = new Map(dashboard.data.orders.map((o) => [o.id, o]));
  const next = route?.stops.find((s) => s.status !== "completed");
  const nextOrder = next ? orders.get(next.orderId) : null;

  return (
    <div className="mx-auto min-h-screen max-w-3xl space-y-4">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition">
        <ChevronLeft size={16} /> Sign out
      </Link>

      {/* Single Driver Profile Lock Header */}
      <header className="panel overflow-hidden border-lime/30">
        <div className="bg-gradient-to-br from-lime/15 via-cyan/5 to-slate-900/40 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-lime/20 px-2 py-0.5 text-[10px] font-black uppercase text-lime">Signed in driver</span>
                <span className="text-xs text-slate-400">ID: {driver.id}</span>
              </div>
              <h1 className="mt-2 text-3xl font-black">{driver.name}</h1>
            </div>
            <StatusBadge value={driver.status} />
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-300">
            <span>📦 {assignedRoute?.stops.length || 0} Parcels from branch</span>
            <span>🛣️ {route?.distanceKm.toFixed(1) || "—"} km Planned Route</span>
            <span>⏱️ {route ? `~${route.estimatedMinutes} min` : "Waiting for AI"}</span>
            <span>🚛 Load: {assignedRoute?.load || 0}/{driver.capacity} Units</span>
          </div>
        </div>
      </header>

      {notice && (
        <div className="rounded-xl border border-lime/30 bg-lime/10 p-3 text-xs text-lime">
          {notice}
        </div>
      )}

      {!journeyStarted && (
        <section className="panel border-cyan/30 bg-gradient-to-r from-cyan/10 via-panel to-lime/10 p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-cyan"><Sparkles size={15} /> AI route decision ready</div><h2 className="mt-2 text-2xl font-black text-white">Start your journey when you leave the branch</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">VANTA will evaluate every assigned parcel, delivery window and route constraint, then highlight exactly which customer to visit first.</p></div>
            <button className="button-primary shrink-0" disabled={startJourneyMutation.isPending} onClick={() => startJourneyMutation.mutate()}><Sparkles size={17} /> {startJourneyMutation.isPending ? "Deciding route…" : "Start journey"}</button>
          </div>
        </section>
      )}

      {/* Map showing ONLY this driver's single route & stops */}
      <div className="panel p-2">
        <OperationsMap
          orders={dashboard.data.orders}
          drivers={[driver]}
          plan={journeyStarted ? dashboard.data.activePlan : null}
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

          {/* Detailed Structured AI Instructions */}
          <div className="rounded-xl border border-lime/30 bg-lime/5 p-4 space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-lime flex items-center gap-2">
              <Bot size={18} /> Structured AI Delivery Guidance
            </div>
            <div className="whitespace-pre-line text-xs sm:text-sm leading-relaxed text-slate-100 font-medium">
              {next.instruction}
            </div>
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
      ) : !journeyStarted ? (
        <section className="panel border-dashed border-line p-8 text-center"><RouteIconPlaceholder /><h2 className="mt-3 text-xl font-black">Your parcels are waiting for a route</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Start the journey above and VANTA will choose the first customer, then guide you through every next stop.</p></section>
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
          <h2 className="font-bold text-sm uppercase tracking-wider text-slate-300">AI delivery sequence</h2>
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

                {/* Detailed Structured AI Instruction for each stop in sequence */}
                <div className="rounded-lg bg-black/40 p-3 text-slate-200 text-xs border border-white/5 space-y-1">
                  <div className="font-bold text-lime text-[11px] flex items-center gap-1">
                    <Bot size={13} /> AI Delivery Guidance:
                  </div>
                  <div className="whitespace-pre-line leading-relaxed">
                    {stop.instruction}
                  </div>
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
