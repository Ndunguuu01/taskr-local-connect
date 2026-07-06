import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

export type PickedLocation = { lat: number; lng: number; address: string };

const DEFAULT_CENTER = { lat: -1.286389, lng: 36.817223 }; // Nairobi

export function LocationPicker({
  value,
  onChange,
  height = 300,
}: {
  value?: PickedLocation | null;
  onChange: (loc: PickedLocation) => void;
  height?: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState(value?.address ?? "");

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !mapRef.current) return;
        const center = value ? { lat: value.lat, lng: value.lng } : DEFAULT_CENTER;
        const map = new g.maps.Map(mapRef.current, {
          center,
          zoom: value ? 15 : 12,
          disableDefaultUI: true,
          zoomControl: true,
        });
        mapInstance.current = map;
        markerRef.current = new g.maps.Marker({ position: center, map, draggable: true });

        const geocoder = new g.maps.Geocoder();
        const commit = (latLng: google.maps.LatLng) => {
          markerRef.current?.setPosition(latLng);
          geocoder.geocode({ location: latLng }, (results, status) => {
            const addr = status === "OK" && results?.[0]?.formatted_address ? results[0].formatted_address : `${latLng.lat().toFixed(5)}, ${latLng.lng().toFixed(5)}`;
            setAddress(addr);
            onChange({ lat: latLng.lat(), lng: latLng.lng(), address: addr });
          });
        };

        map.addListener("click", (e: google.maps.MapMouseEvent) => e.latLng && commit(e.latLng));
        markerRef.current.addListener("dragend", () => {
          const p = markerRef.current?.getPosition();
          if (p) commit(p);
        });

        if (inputRef.current) {
          const ac = new g.maps.places.Autocomplete(inputRef.current, { fields: ["formatted_address", "geometry"] });
          ac.bindTo("bounds", map);
          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            if (!place.geometry?.location) return;
            const loc = place.geometry.location;
            map.panTo(loc);
            map.setZoom(15);
            const addr = place.formatted_address ?? "";
            markerRef.current?.setPosition(loc);
            setAddress(addr);
            onChange({ lat: loc.lat(), lng: loc.lng(), address: addr });
          });
        }
      })
      .catch((e) => setError(e.message));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Search address or click on the map"
          className="pl-9"
        />
      </div>
      <div ref={mapRef} style={{ height }} className="w-full overflow-hidden rounded-lg border border-border bg-muted" />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Tip: click the map or drag the pin to set the exact spot.</p>
    </div>
  );
}
