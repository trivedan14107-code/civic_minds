import { ArrowRight, LockKeyhole, Package, Route as RouteIcon, ShieldCheck, Truck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorPanel, Loading } from "../components/Feedback";
import { useDashboard } from "../hooks/useDashboard";
import { errorMessage } from "../lib/api";

export default function DriverHomePage() {
  const query = useDashboard();
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState("DRV-001");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  if (query.isLoading) return <Loading label="Connecting to VANTA dispatch…" />;
  if (query.isError || !query.data) return <ErrorPanel message={errorMessage(query.error)} retry={() => query.refetch()} />;

  const signIn = (event: React.FormEvent) => {
    event.preventDefault();
    const driver = query.data.drivers.find((item) => item.id.toLowerCase() === driverId.trim().toLowerCase());
    if (!driver) return setError("Driver ID not found. Use one of the IDs configured by dispatch.");
    if (pin && pin !== "1234") return setError("That access code is not valid for this demo.");
    sessionStorage.setItem("vanta-driver-id", driver.id);
    navigate(`/driver/${driver.id}`);
  };

  return (
    <main className="mx-auto grid min-h-[calc(100vh-96px)] max-w-5xl items-center gap-8 py-6 lg:grid-cols-[1.05fr_.95fr] lg:py-12">
      <section className="space-y-6 px-1 lg:pr-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-lime"><span className="h-1.5 w-1.5 rounded-full bg-lime" /> VANTA Driver Console</div>
        <div><h1 className="max-w-xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">Your route.<br /><span className="text-lime">Decided intelligently.</span></h1><p className="mt-5 max-w-lg text-base leading-7 text-slate-400">Sign in to see the parcels picked up from your branch. When you start your journey, VANTA evaluates every stop and gives you the best order to deliver.</p></div>
        <div className="grid max-w-lg grid-cols-3 gap-3"><div className="rounded-2xl border border-line bg-panel/60 p-3"><Package className="text-cyan" size={18} /><p className="mt-3 text-xs font-bold text-slate-200">Your parcels</p><p className="mt-1 text-[11px] text-slate-500">Assigned to you</p></div><div className="rounded-2xl border border-line bg-panel/60 p-3"><RouteIcon className="text-lime" size={18} /><p className="mt-3 text-xs font-bold text-slate-200">Best sequence</p><p className="mt-1 text-[11px] text-slate-500">Stop by stop</p></div><div className="rounded-2xl border border-line bg-panel/60 p-3"><ShieldCheck className="text-amber-300" size={18} /><p className="mt-3 text-xs font-bold text-slate-200">Live guidance</p><p className="mt-1 text-[11px] text-slate-500">Clear instructions</p></div></div>
      </section>
      <section className="panel overflow-hidden border-lime/25 shadow-2xl shadow-black/25"><div className="border-b border-line bg-gradient-to-r from-lime/10 to-cyan/5 p-6 sm:p-8"><div className="mb-6 flex items-center justify-between"><img src="/vanta-logo.png" alt="VANTA logo" className="h-16 w-16 rounded-2xl object-cover shadow-glow" /><div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-300" /> Secure sign in</div></div><h2 className="text-2xl font-black text-white">Driver sign in</h2><p className="mt-2 text-sm leading-6 text-slate-400">Use the credentials provided by your dispatch branch.</p></div>
        <form onSubmit={signIn} className="space-y-5 p-6 sm:p-8"><div><label className="label" htmlFor="driver-id">Driver ID</label><div className="relative"><Truck className="pointer-events-none absolute left-3 top-3 text-slate-500" size={17} /><input id="driver-id" className="input pl-10" value={driverId} onChange={(e) => setDriverId(e.target.value)} placeholder="Example: DRV-001" /></div></div><div><label className="label" htmlFor="driver-pin">Access code <span className="font-normal text-slate-600">(optional in prototype)</span></label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3 text-slate-500" size={17} /><input id="driver-pin" type="password" className="input pl-10" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter branch access code" /></div></div>{error && <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-xs font-semibold text-rose-200">{error}</p>}<button className="button-primary w-full" type="submit">Open my delivery board <ArrowRight size={17} /></button><p className="text-center text-[11px] text-slate-600">Prototype demo code: <span className="text-slate-400">1234</span> · Leave it blank to continue</p></form>
      </section>
    </main>
  );
}
