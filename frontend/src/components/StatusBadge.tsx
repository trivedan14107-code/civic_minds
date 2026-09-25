const colors: Record<string, string> = {
  active: "border-lime/30 bg-lime/10 text-lime",
  assigned: "border-cyan/30 bg-cyan/10 text-cyan",
  available: "border-cyan/30 bg-cyan/10 text-cyan",
  delivered: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  delayed: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  urgent: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  offline: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

export default function StatusBadge({ value }: { value: string }) {
  return <span className={`badge ${colors[value] || "border-slate-500/30 bg-slate-500/10 text-slate-300"}`}>{value.replace("_", " ")}</span>;
}
