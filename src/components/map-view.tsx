import { useEffect, useRef } from "react";

/* ---------- Lazy Leaflet loader (SSR-safe) ---------- */
let leafletPromise: Promise<typeof import("leaflet")> | null = null;

function getLeaflet() {
  if (typeof window === "undefined")
    return Promise.reject(new Error("Leaflet requires a browser"));
  if (!leafletPromise) {
    leafletPromise = import("leaflet").then((mod) => {
      import("leaflet/dist/leaflet.css");
      const L = mod.default;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      return L;
    });
  }
  return leafletPromise;
}

export function MapView({
  lat,
  lng,
  height = 240,
}: {
  lat: number;
  lng: number;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    getLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;

        // If map already exists, just update the view
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 14);
          markerRef.current?.setLatLng([lat, lng]);
          return;
        }

        const map = L.map(containerRef.current, {
          center: [lat, lng],
          zoom: 14,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        markerRef.current = L.marker([lat, lng]).addTo(map);
        mapRef.current = map;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full overflow-hidden rounded-lg border border-border bg-muted"
    />
  );
}
