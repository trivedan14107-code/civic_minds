import { Activity, Boxes, LayoutDashboard, Menu, Truck, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import DriverPage from "./pages/DriverPage";
import DriversPage from "./pages/DriversPage";
import OrdersPage from "./pages/OrdersPage";

const links = [
  { to: "/", label: "Operations", icon: LayoutDashboard },
  { to: "/orders", label: "Orders", icon: Boxes },
  { to: "/drivers", label: "Drivers", icon: Truck },
];

function Navigation({ close }: { close?: () => void }) {
  return (
    <nav className="space-y-1">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === "/"} onClick={close} className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
          <Icon size={18} /> {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-ink text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-[#0d151e] p-5 lg:block">
        <Brand />
        <div className="mt-10"><Navigation /></div>
        <div className="absolute bottom-6 left-5 right-5 rounded-xl border border-line bg-panel/60 p-4 text-xs text-slate-400">
          <div className="mb-2 flex items-center gap-2 font-semibold text-lime"><Activity size={15} /> Autonomous loop</div>
          Observe · Optimize · Assign · Monitor · Re-plan
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-ink/90 px-4 backdrop-blur lg:hidden">
        <Brand compact />
        <button className="icon-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button>
      </header>
      {open && <div className="fixed inset-x-0 top-16 z-20 border-b border-line bg-[#0d151e] p-4 lg:hidden"><Navigation close={() => setOpen(false)} /></div>}
      <main className="lg:ml-64"><Routes><Route path="/" element={<DashboardPage />} /><Route path="/orders" element={<OrdersPage />} /><Route path="/drivers" element={<DriversPage />} /><Route path="/driver/:driverId" element={<DriverPage />} /></Routes></main>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-lime font-black text-ink shadow-glow">V</div><div className={compact ? "" : "leading-tight"}><div className="font-black tracking-[.22em]">VANTA</div>{!compact && <div className="text-[10px] uppercase tracking-[.16em] text-slate-500">Autonomous operations</div>}</div></div>;
}
