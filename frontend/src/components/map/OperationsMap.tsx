import * as maplibregl from "maplibre-gl";
import type { Map, MapMouseEvent, Marker } from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef } from "react";
import type { Driver, Order, Plan } from "../../lib/types";

maplibregl.setWorkerUrl(mapWorkerUrl);

interface Props {
  orders: Order[];
  drivers: Driver[];
  plan: Plan | null;
  selectedDriverId?: string | null;
  onMapClick?: (latitude: number, longitude: number) => void;
  className?: string;
}

export default function OperationsMap({
  orders,
  drivers,
  plan,
  selectedDriverId,
  onMapClick,
  className = "h-[480px]",
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markers = useRef<Marker[]>([]);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [78.4867, 17.385],
      zoom: 11,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    if (onMapClick) map.on("click", (event: MapMouseEvent) => onMapClick(event.lngLat.lat, event.lngLat.lng));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const render = () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      const bounds = new maplibregl.LngLatBounds();

      // Filter drivers if single driver selected
      const displayDrivers = selectedDriverId ? drivers.filter((d) => d.id === selectedDriverId) : drivers;

      // Render Order Markers with sequence numbers & detailed instructions
      orders.forEach((order) => {
        let sequenceNum: number | null = null;
        let driverColor = "#f59e0b"; // amber fallback for unassigned
        let driverName = "";

        if (plan) {
          for (const route of plan.routes) {
            if (selectedDriverId && route.driverId !== selectedDriverId) continue;
            const stop = route.stops.find((s) => s.orderId === order.id);
            if (stop) {
              sequenceNum = stop.sequence;
              driverColor = route.color;
              const drv = drivers.find((d) => d.id === route.driverId);
              if (drv) driverName = drv.name;
              break;
            }
          }
        }

        if (selectedDriverId && sequenceNum === null) {
          // If viewing a single driver, don't show other driver's assigned orders
          return;
        }

        const el = document.createElement("div");
        el.className = "cursor-pointer";

        const badgeText = sequenceNum ? `${sequenceNum}` : order.status === "delivered" ? "✓" : "?";
        const bgStyle = sequenceNum ? driverColor : order.status === "delivered" ? "#10b981" : "#f59e0b";

        el.innerHTML = `
          <div style="background-color: ${bgStyle}" class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-black text-white shadow-xl transition-transform hover:scale-125">
            ${badgeText}
          </div>
        `;

        const availBadge =
          order.customerAvailability === "unavailable_reschedule"
            ? '<span style="color:#f43f5e;background:#881337;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;">Unavailable</span>'
            : order.customerAvailability === "pending_verification"
            ? '<span style="color:#fde047;background:#713f12;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;">AI Notice Pending</span>'
            : '<span style="color:#34d399;background:#064e3b;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;">Confirmed Available</span>';

        const popupContent = `
          <div style="font-family:sans-serif;font-size:12px;color:#e2e8f0;padding:4px;max-width:260px;">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155;padding-bottom:4px;margin-bottom:6px;">
              <span style="color:#a3e635;font-weight:bold;">${
                sequenceNum
                  ? `Stop #${sequenceNum} (${sequenceNum === 1 ? "1st Stop" : sequenceNum === 2 ? "2nd Stop" : sequenceNum === 3 ? "3rd Stop" : sequenceNum + "th Stop"})`
                  : "Unassigned Order"
              }</span>
              ${availBadge}
            </div>
            <div style="font-size:14px;font-weight:bold;color:#ffffff;">${order.customerName}</div>
            <div style="color:#cbd5e1;margin-bottom:4px;">📍 ${order.address}</div>
            ${driverName ? `<div style="color:#94a3b8;font-size:11px;margin-bottom:4px;">Assigned to: <strong style="color:#ffffff;">${driverName}</strong></div>` : ""}
            <div style="background:#0f172a;padding:6px;border-radius:6px;border:1px solid #334155;margin-top:6px;margin-bottom:6px;">
              <div style="color:#38bdf8;font-weight:bold;font-size:11px;margin-bottom:2px;">📋 Detailed Instructions:</div>
              <div style="color:#f1f5f9;font-size:11px;line-height:1.4;">${order.deliveryInstructions || "Deliver safely and confirm at the door."}</div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;">
              <span>Demand: ${order.demand} unit(s)</span>
              <span>Priority: <strong style="color:#a3e635;text-transform:uppercase;">${order.priority}</strong></span>
            </div>
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 16 }).setHTML(popupContent);
        markers.current.push(new maplibregl.Marker({ element: el }).setLngLat([order.longitude, order.latitude]).setPopup(popup).addTo(map));
        bounds.extend([order.longitude, order.latitude]);
      });

      // Render Driver Location Markers
      displayDrivers.forEach((driver) => {
        const el = document.createElement("div");
        el.className = "cursor-pointer";
        el.innerHTML = `
          <div class="grid h-9 w-9 place-items-center rounded-xl border-2 text-xs font-black shadow-xl ${
            driver.status === "delayed" ? "border-amber-300 bg-amber-400 text-ink" : "border-lime bg-slate-950 text-lime"
          }">
            🚚 ${driver.name.slice(0, 1)}
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 18 }).setHTML(
          `<div style="font-family:sans-serif;font-size:12px;color:#fff;padding:2px;">
            <strong>🚚 Driver: ${driver.name}</strong><br/>
            <span style="color:#94a3b8;">Status: ${driver.status}</span><br/>
            <span style="color:#94a3b8;">Vehicle Capacity: ${driver.capacity} units</span>
          </div>`
        );
        markers.current.push(new maplibregl.Marker({ element: el }).setLngLat([driver.longitude, driver.latitude]).setPopup(popup).addTo(map));
        bounds.extend([driver.longitude, driver.latitude]);
      });

      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 55, maxZoom: 13, duration: 700 });

      // Render Polylines for Driver Routes
      const updateRoutes = () => {
        for (let index = 0; index < 20; index++) {
          const id = `route-${index}`;
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(id)) map.removeSource(id);
        }

        plan?.routes.forEach((route, index) => {
          if (selectedDriverId && route.driverId !== selectedDriverId) return;
          const id = `route-${index}`;
          map.addSource(id, { type: "geojson", data: { type: "Feature", properties: {}, geometry: route.geometry } });
          map.addLayer({
            id,
            type: "line",
            source: id,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": route.color,
              "line-width": 5,
              "line-opacity": 0.9,
            },
          });
        });
      };

      if (map.isStyleLoaded()) updateRoutes();
      else map.once("load", updateRoutes);
    };

    render();
  }, [orders, drivers, plan, selectedDriverId]);

  return <div ref={container} className={`overflow-hidden rounded-2xl ${className}`} aria-label="VANTA operations map" />;
}
