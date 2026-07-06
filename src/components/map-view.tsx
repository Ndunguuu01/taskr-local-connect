import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";

export function MapView({ lat, lng, height = 240 }: { lat: number; lng: number; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadGoogleMaps().then((g) => {
      if (!ref.current) return;
      const map = new g.maps.Map(ref.current, {
        center: { lat, lng },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
      });
      new g.maps.Marker({ position: { lat, lng }, map });
    }).catch(() => {});
  }, [lat, lng]);
  return <div ref={ref} style={{ height }} className="w-full overflow-hidden rounded-lg border border-border bg-muted" />;
}
