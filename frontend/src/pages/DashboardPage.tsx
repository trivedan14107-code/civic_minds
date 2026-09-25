import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import MetricCards from "../components/dashboard/MetricCards";
import PlanPanel from "../components/dashboard/PlanPanel";
import { ErrorPanel, Loading } from "../components/Feedback";
import OperationsMap from "../components/map/OperationsMap";
import StatusBadge from "../components/StatusBadge";
import { useDashboard } from "../hooks/useDashboard";
import { api, errorMessage } from "../lib/api";

export default function DashboardPage() {
  const dashboard = useDashboard();
  const queryClient = useQueryClient();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [delayDriver, setDelayDriver] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  const optimize = useMutation({ mutationFn: () => api.optimize(), onSuccess: (plan) => { setNotice(`Plan v${plan.version} generated with ${plan.routes.length} routes.`); refresh(); } });
  const delay = useMutation({ mutationFn: () => api.simulateDelay(delayDriver, 30), onSuccess: (plan) => { setNotice(`Plan v${plan.version} created after delay simulation.`); refresh(); } });

  if (dashboard.isLoading) return <Loading />;
  if (dashboard.isError || !dashboard.data) return <ErrorPanel message={errorMessage(dashboard.error)} retry={() => dashboard.refetch()} />;
  const data = dashboard.data;
  const actionError = optimize.error || delay.error;
  return <div className="page space-y-5"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-lime">Live command center</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Delivery operations</h1><p className="mt-2 text-sm text-slate-400">Hyderabad · polling every 5 seconds</p></div><button className="button-primary w-full sm:w-auto" onClick={() => optimize.mutate()} disabled={optimize.isPending}><Sparkles size={17} />{optimize.isPending ? "Optimizing…" : data.activePlan ? "Re-optimize" : "Generate plan"}</button></header><MetricCards metrics={data.metrics} />
    {(notice || actionError) && <div className={`rounded-xl border p-3 text-sm ${actionError ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-lime/30 bg-lime/10 text-lime"}`}>{actionError ? errorMessage(actionError) : notice}</div>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="panel overflow-hidden p-2"><OperationsMap orders={data.orders} drivers={data.drivers} plan={data.activePlan} selectedDriverId={selectedDriver} className="h-[480px] sm:h-[620px]" /></div><div className="space-y-5"><PlanPanel plan={data.activePlan} drivers={data.drivers} orders={data.orders} selectedDriverId={selectedDriver} onSelect={setSelectedDriver} /><div className="panel p-5"><div className="panel-title">Disruption simulation</div><p className="mt-2 text-sm text-slate-400">Delay one driver by 30 minutes and let VANTA re-plan unfinished work.</p><select className="input mt-4" value={delayDriver} onChange={(event) => setDelayDriver(event.target.value)}><option value="">Choose a driver</option>{data.drivers.filter((driver) => driver.status !== "offline").map((driver) => <option key={driver.id} value={driver.id}>{driver.name} · {driver.status}</option>)}</select><button className="button-secondary mt-3 w-full" disabled={!delayDriver || delay.isPending} onClick={() => delay.mutate()}><RefreshCw size={16} />{delay.isPending ? "Re-planning…" : "Simulate 30 min delay"}</button></div></div></div>

    <div className="grid gap-5 lg:grid-cols-2"><div className="panel p-5"><div className="mb-4 flex items-center justify-between"><div className="panel-title">Priority orders</div><span className="text-xs text-slate-500">{data.orders.length} total</span></div><div className="space-y-2">{data.orders.slice().sort((a,b) => ({urgent:0,high:1,normal:2}[a.priority]-{urgent:0,high:1,normal:2}[b.priority])).slice(0,5).map((order) => <div key={order.id} className="flex items-center justify-between rounded-xl bg-black/15 p-3"><div><div className="text-sm font-bold">{order.address}</div><div className="mt-1 text-xs text-slate-500">{order.id} · {order.customerName}</div></div><StatusBadge value={order.priority === "normal" ? order.status : order.priority} /></div>)}</div></div><div className="panel p-5"><div className="panel-title">Alerts & changes</div><div className="mt-4 space-y-2">{[...data.alerts.map((a) => ({ id:a.id, message:a.message, warning:true })), ...(data.activePlan?.changes || []).map((c) => ({ id:c.orderId, message:`${c.orderId}: ${c.fromDriverId} → ${c.toDriverId}`, warning:false }))].map((item) => <div key={item.id} className="flex gap-3 rounded-xl bg-black/15 p-3 text-sm"><AlertTriangle size={17} className={item.warning ? "text-amber-300" : "text-cyan"} /><span>{item.message}</span></div>)}{!data.alerts.length && !data.activePlan?.changes.length && <p className="py-8 text-center text-sm text-slate-500">No active disruptions or reassigned orders.</p>}</div></div></div>
  </div>;
}
