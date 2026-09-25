import { Clock3, MapPinned, PackageOpen, Truck } from "lucide-react";
import type { Dashboard } from "../../lib/types";

export default function MetricCards({ metrics }: { metrics: Dashboard["metrics"] }) {
  const cards = [
    { label: "Unassigned", value: metrics.unassignedOrders, icon: PackageOpen, tone: "text-amber-300" },
    { label: "Active drivers", value: metrics.activeDrivers, icon: Truck, tone: "text-cyan" },
    { label: "On-time plan", value: `${metrics.onTimePercentage}%`, icon: Clock3, tone: "text-lime" },
    { label: "Planned distance", value: `${metrics.totalDistanceKm.toFixed(1)} km`, icon: MapPinned, tone: "text-violet-300" },
  ];
  return <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, tone }) => <div key={label} className="panel p-4 sm:p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{label}</span><Icon size={18} className={tone} /></div><div className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{value}</div></div>)}</div>;
}
