import { Route, Routes } from "react-router-dom";
import DriverHomePage from "./pages/DriverHomePage";
import DriverPage from "./pages/DriverPage";

export default function App() {
  return <div className="min-h-screen bg-ink text-slate-100"><header className="sticky top-0 z-30 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-lime font-black text-ink shadow-glow">V</div><div><div className="font-black tracking-[.22em]">VANTA</div><div className="text-[10px] uppercase tracking-[.16em] text-slate-500">Driver intelligence</div></div></div></header><Routes><Route path="/" element={<DriverHomePage/>}/><Route path="/driver/:driverId" element={<DriverPage/>}/><Route path="*" element={<DriverHomePage/>}/></Routes></div>;
}
