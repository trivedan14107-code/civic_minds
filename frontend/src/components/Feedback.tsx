import { AlertTriangle, LoaderCircle } from "lucide-react";

export function Loading({ label = "Loading operations…" }: { label?: string }) {
  return <div className="grid min-h-64 place-items-center"><div className="flex items-center gap-3 text-sm text-slate-400"><LoaderCircle className="animate-spin text-lime" />{label}</div></div>;
}

export function ErrorPanel({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="panel m-4 border-rose-500/30 p-6 sm:m-8"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-rose-400" /><div><h2 className="font-bold">Connection interrupted</h2><p className="mt-1 text-sm text-slate-400">{message}</p>{retry && <button className="button-secondary mt-4" onClick={retry}>Try again</button>}</div></div></div>;
}
