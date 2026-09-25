import { Link, NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import DriverHomePage from "./pages/DriverHomePage";
import DriverPage from "./pages/DriverPage";
import DriversPage from "./pages/DriversPage";
import OrdersPage from "./pages/OrdersPage";

export default function App() {
  return (
    <div className="min-h-screen bg-ink text-slate-100">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime font-black text-ink shadow-glow">V</div>
            <div>
              <div className="font-black tracking-[.22em]">VANTA</div>
              <div className="text-[10px] uppercase tracking-[.16em] text-slate-500">Autonomous Operations</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive ? "bg-lime/15 text-lime" : "text-slate-400 hover:text-slate-100"
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive ? "bg-lime/15 text-lime" : "text-slate-400 hover:text-slate-100"
                }`
              }
            >
              Orders
            </NavLink>
            <NavLink
              to="/drivers"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive ? "bg-lime/15 text-lime" : "text-slate-400 hover:text-slate-100"
                }`
              }
            >
              Drivers
            </NavLink>
            <NavLink
              to="/driver-portal"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive ? "bg-lime/15 text-lime" : "text-slate-400 hover:text-slate-100"
                }`
              }
            >
              Driver View
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/driver-portal" element={<DriverHomePage />} />
          <Route path="/driver/:driverId" element={<DriverPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}

