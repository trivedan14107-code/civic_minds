import * as maplibregl from "maplibre-gl";
import type { Map, MapMouseEvent, Marker } from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef } from "react";
import type { Driver, Order, Plan } from "../../lib/types";

maplibregl.setWorkerUrl(mapWorkerUrl);

interface Props { orders: Order[]; drivers: Driver[]; plan: Plan | null; selectedDriverId?: string | null; onMapClick?: (latitude: number, longitude: number) => void; className?: string; }

export default function OperationsMap({ orders, drivers, plan, selectedDriverId, onMapClick, className = "h-[480px]" }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markers = useRef<Marker[]>([]);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: container.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [78.4867, 17.385], zoom: 11, attributionControl: false });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    if (onMapClick) map.on("click", (event: MapMouseEvent) => onMapClick(event.lngLat.lat, event.lngLat.lng));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const render = () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      const bounds = new maplibregl.LngLatBounds();
      orders.forEach((order) => {
        const el = document.createElement("button");
        el.className = `h-4 w-4 rounded-full border-2 border-white shadow-lg ${order.status === "delivered" ? "bg-emerald-400" : order.status === "failed" ? "bg-rose-500" : order.status === "unassigned" ? "bg-amber-400" : "bg-cyan"}`;
        el.setAttribute("aria-label", `Order ${order.id}`);
        const popup = new maplibregl.Popup({ offset: 14 }).setHTML(`<strong>${order.id}</strong><br/><span>${order.address}</span><br/><small>${order.priority} · ${order.status.replace("_", " ")}</small>`);
        markers.current.push(new maplibregl.Marker({ element: el }).setLngLat([order.longitude, order.latitude]).setPopup(popup).addTo(map));
        bounds.extend([order.longitude, order.latitude]);
      });
      drivers.forEach((driver) => {
        const el = document.createElement("button");
        el.className = `grid h-8 w-8 place-items-center rounded-xl border-2 text-xs font-black shadow-xl ${driver.status === "delayed" ? "border-amber-300 bg-amber-400 text-ink" : "border-lime bg-ink text-lime"}`;
        el.textContent = driver.name.slice(0, 1);
        const popup = new maplibregl.Popup({ offset: 18 }).setHTML(`<strong>${driver.name}</strong><br/><small>${driver.status} · capacity ${driver.capacity}</small>`);
        markers.current.push(new maplibregl.Marker({ element: el }).setLngLat([driver.longitude, driver.latitude]).setPopup(popup).addTo(map));
        bounds.extend([driver.longitude, driver.latitude]);
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 55, maxZoom: 13, duration: 700 });

      const updateRoutes = () => {
        const routeIds = (plan?.routes || []).map((_, index) => `route-${index}`);
        for (let index = 0; index < 20; index++) {
          const id = `route-${index}`;
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(id)) map.removeSource(id);
        }
        plan?.routes.forEach((route, index) => {
          const id = routeIds[index];
          map.addSource(id, { type: "geojson", data: { type: "Feature", properties: {}, geometry: route.geometry } });
          map.addLayer({ id, type: "line", source: id, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": route.color, "line-width": selectedDriverId && selectedDriverId !== route.driverId ? 2 : 5, "line-opacity": selectedDriverId && selectedDriverId !== route.driverId ? 0.18 : 0.9 } });
        });
      };
      if (map.isStyleLoaded()) updateRoutes(); else map.once("load", updateRoutes);
    };
    render();
  }, [orders, drivers, plan, selectedDriverId]);

  return <div ref={container} className={`overflow-hidden rounded-2xl ${className}`} aria-label="VANTA operations map" />;
}
