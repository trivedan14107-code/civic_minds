import { ArrowRight, Route as RouteIcon, Truck, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorPanel, Loading } from "../components/Feedback";
import StatusBadge from "../components/StatusBadge";
import { useDashboard } from "../hooks/useDashboard";
import { errorMessage } from "../lib/api";

export default function DriverHomePage() {
  const query = useDashboard();

  if (query.isLoading) return <Loading label="Loading driver fleet…" />;
  if (query.isError || !query.data) return <ErrorPanel message={errorMessage(query.error)} retry={() => query.refetch()} />;

  const plan = query.data.activePlan;

  return (
    <main className="mx-auto max-w-5xl space-y-6 py-4">
      <section className="py-4 sm:py-6">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-lime">Driver Profile Portal</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Select Your Driver Profile
        </h1>
        <p className="mt-2 max-w-xl text-xs text-slate-400">
          Only one driver profile is active at a time. Select your profile to launch your isolated route, stop sequence, customer details, and AI delivery instructions.
        </p>
      </section>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {query.data.drivers.map((driver) => {
          const route = plan?.routes.find((r) => r.driverId === driver.id);
          return (
            <article key={driver.id} className="panel p-5 space-y-4 hover:border-lime/40 transition">
              <div className="flex items-start justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-cyan/10 text-cyan">
                  <Truck size={22} />
                </div>
                <StatusBadge value={driver.status} />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white">{driver.name}</h2>
                <div className="text-xs text-slate-400 mt-0.5">Profile ID: {driver.id}</div>
              </div>

              <div className="rounded-xl bg-black/20 p-3 space-y-1 text-xs border border-line">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <RouteIcon size={15} className="text-lime" />
                  <strong>{route?.stops.length || 0}</strong> Assigned Stops
                </div>
                <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                  <span>Distance: {route?.distanceKm.toFixed(1) || "0.0"} km</span>
                  <span>Vehicle Capacity: {driver.capacity} units</span>
                </div>
              </div>

              <Link className="button-primary w-full flex items-center justify-center gap-2 text-xs" to={`/driver/${driver.id}`}>
                <UserCheck size={16} /> Launch Profile ({driver.name}) <ArrowRight size={15} />
              </Link>
            </article>
          );
        })}
      </div>
    </main>
  );
}
