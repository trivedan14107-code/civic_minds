import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Bot, MapPin, Plus, Search, UserCheck, UserX } from "lucide-react";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { ErrorPanel, Loading } from "../components/Feedback";
import OperationsMap from "../components/map/OperationsMap";
import StatusBadge from "../components/StatusBadge";
import { api, errorMessage } from "../lib/api";
import type { OrderInput, OrderStatus, Priority } from "../lib/types";

const localTime = (hour: number) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function OrdersPage() {
  const query = useQuery({ queryKey: ["orders"], queryFn: api.orders });
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [priority, setPriority] = useState<"all" | Priority>("all");
  const [form, setForm] = useState<OrderInput>({
    customerName: "",
    address: "",
    latitude: 17.385,
    longitude: 78.4867,
    demand: 1,
    serviceMinutes: 10,
    windowStart: localTime(10),
    windowEnd: localTime(16),
    priority: "normal",
    deliveryInstructions: "Deliver safely and confirm at the door.",
  });
  const [message, setMessage] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: api.createOrder,
    onSuccess: (order) => {
      setMessage(`${order.id} created and added to the demand queue.`);
      setForm({ ...form, customerName: "", address: "" });
      client.invalidateQueries({ queryKey: ["orders"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const notifyMutation = useMutation({
    mutationFn: (orderId: string) => api.notifyCustomer(orderId),
    onSuccess: (res) => {
      setMessage(res.message);
      client.invalidateQueries({ queryKey: ["orders"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ orderId, availability }: { orderId: string; availability: "confirmed_available" | "unavailable_reschedule" }) =>
      api.updateAvailability(orderId, availability),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["orders"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const pick = useCallback((latitude: number, longitude: number) => setForm((current) => ({ ...current, latitude: +latitude.toFixed(6), longitude: +longitude.toFixed(6) })), []);

  const filtered = useMemo(
    () =>
      (query.data || []).filter(
        (o) =>
          (status === "all" || o.status === status) &&
          (priority === "all" || o.priority === priority) &&
          `${o.id} ${o.customerName} ${o.address} ${o.deliveryInstructions}`.toLowerCase().includes(search.toLowerCase())
      ),
    [query.data, status, priority, search]
  );

  if (query.isLoading) return <Loading label="Loading order queue…" />;
  if (query.isError) return <ErrorPanel message={errorMessage(query.error)} retry={() => query.refetch()} />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    create.mutate({
      ...form,
      windowStart: new Date(form.windowStart).toISOString(),
      windowEnd: new Date(form.windowEnd).toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-lime">Demand Queue</p>
        <h1 className="mt-1 text-3xl font-black">Delivery Orders</h1>
        <p className="mt-1 text-xs text-slate-400">Manage delivery demand, detailed instructions, and AI customer availability verification.</p>
      </header>

      {message && (
        <div className="rounded-xl border border-lime/30 bg-lime/10 p-3 text-xs text-lime">
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        {/* Orders Queue List */}
        <section className="space-y-4">
          <div className="panel flex flex-col gap-3 p-4 sm:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-3 text-slate-500" size={17} />
              <input className="input pl-10" placeholder="Search customer, address, or detailed instructions" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <select className="input sm:w-40" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="all">All statuses</option>
              <option value="unassigned">Unassigned</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In progress</option>
              <option value="delivered">Delivered</option>
            </select>
            <select className="input sm:w-36" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
              <option value="all">All priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          <div className="panel divide-y divide-line overflow-hidden">
            {filtered.map((order) => {
              const isUnavailable = order.customerAvailability === "unavailable_reschedule";
              const isPending = order.customerAvailability === "pending_verification";

              return (
                <div key={order.id} className="p-4 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-base">{order.customerName}</span>
                        <span className="text-xs text-slate-400">({order.address})</span>
                        <StatusBadge value={order.priority} />
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {order.id} · Demand: {order.demand} unit(s) · Service: {order.serviceMinutes} mins
                      </div>
                    </div>
                    <StatusBadge value={order.status} />
                  </div>

                  {/* Detailed Instructions Display */}
                  <div className="rounded-xl bg-black/30 p-3 border border-line space-y-1 text-xs">
                    <div className="font-bold text-cyan flex items-center gap-1.5">
                      <Bot size={14} /> Detailed Delivery Instructions:
                    </div>
                    <div className="text-slate-200 leading-relaxed font-medium">
                      {order.deliveryInstructions || "Deliver safely and confirm at the door."}
                    </div>
                  </div>

                  {/* AI Availability Verification Control */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <div>
                      {isUnavailable ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                          <UserX size={14} /> AI Alert: Customer Unavailable (Rescheduled)
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                          <Bell size={14} /> AI SMS Sent: Awaiting Response
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                          <UserCheck size={14} /> AI Verified: Confirmed Available
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        title="Send AI Pre-Delivery Notification SMS"
                        disabled={notifyMutation.isPending}
                        onClick={() => notifyMutation.mutate(order.id)}
                        className="rounded-lg border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-xs font-bold text-cyan hover:bg-cyan/20"
                      >
                        <Bell size={12} className="inline mr-1" />
                        Send AI Pre-Delivery SMS
                      </button>
                      {isUnavailable ? (
                        <button
                          disabled={availabilityMutation.isPending}
                          onClick={() => availabilityMutation.mutate({ orderId: order.id, availability: "confirmed_available" })}
                          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
                        >
                          Mark Available
                        </button>
                      ) : (
                        <button
                          disabled={availabilityMutation.isPending}
                          onClick={() => availabilityMutation.mutate({ orderId: order.id, availability: "unavailable_reschedule" })}
                          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
                        >
                          Flag Unavailable
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {!filtered.length && <p className="p-10 text-center text-sm text-slate-500">No orders match these filters.</p>}
          </div>
        </section>

        {/* Create Order Form */}
        <form onSubmit={submit} className="panel h-fit p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="text-lime" size={20} />
            <h2 className="font-bold text-base">Create Delivery Order</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer Name">
              <input required className="input" placeholder="e.g. Ananya" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </Field>
            <Field label="Address Label">
              <input required className="input" placeholder="e.g. Abids, Hyderabad" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Latitude">
              <input required type="number" step="any" className="input" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: +e.target.value })} />
            </Field>
            <Field label="Longitude">
              <input required type="number" step="any" className="input" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: +e.target.value })} />
            </Field>
          </div>

          <p className="flex items-center gap-2 text-xs text-slate-400">
            <MapPin size={14} className="text-lime" /> Click the map below to select exact delivery location.
          </p>

          <OperationsMap orders={[]} drivers={[]} plan={null} onMapClick={pick} className="h-48" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Demand (Units)">
              <input type="number" min="1" className="input" value={form.demand} onChange={(e) => setForm({ ...form, demand: +e.target.value })} />
            </Field>
            <Field label="Service Time (Mins)">
              <input type="number" min="1" className="input" value={form.serviceMinutes} onChange={(e) => setForm({ ...form, serviceMinutes: +e.target.value })} />
            </Field>
            <Field label="Window Start">
              <input type="datetime-local" required className="input" value={form.windowStart.slice(0, 16)} onChange={(e) => setForm({ ...form, windowStart: e.target.value })} />
            </Field>
            <Field label="Window End">
              <input type="datetime-local" required className="input" value={form.windowEnd.slice(0, 16)} onChange={(e) => setForm({ ...form, windowEnd: e.target.value })} />
            </Field>
            <Field label="Priority">
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>
          </div>

          <Field label="Detailed Delivery Instructions">
            <textarea
              required
              rows={3}
              className="input resize-none"
              placeholder="e.g. Ring apartment bell 402, deliver safely and confirm recipient."
              value={form.deliveryInstructions}
              onChange={(e) => setForm({ ...form, deliveryInstructions: e.target.value })}
            />
          </Field>

          {create.error && <p className="text-xs text-rose-300">{errorMessage(create.error)}</p>}

          <button className="button-primary w-full" disabled={create.isPending}>
            {create.isPending ? "Creating Order…" : "Add to Demand Queue"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label text-xs font-bold text-slate-300 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
