import { Link, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import DriverHomePage from "./pages/DriverHomePage";
import DriverPage from "./pages/DriverPage";

export default function App() {
  return (
    <div className="min-h-screen bg-ink text-slate-100">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/vanta-logo.png" alt="VANTA logo" className="h-10 w-10 rounded-xl object-cover shadow-glow" />
            <div>
              <div className="font-black tracking-[.22em]">VANTA</div>
              <div className="text-[10px] uppercase tracking-[.16em] text-slate-500">Autonomous Operations</div>
            </div>
          </Link>
          <div className="hidden items-center gap-2 text-xs font-semibold text-slate-400 sm:flex">
            <span className="h-2 w-2 rounded-full bg-lime shadow-[0_0_14px_rgba(163,230,53,.8)]" />
            Driver operations online
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <Routes>
          <Route path="/" element={<DriverHomePage />} />
          <Route path="/driver-portal" element={<DriverHomePage />} />
          <Route path="/driver/:driverId" element={<DriverPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders" element={<Navigate to="/" replace />} />
          <Route path="/drivers" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

