import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Search } from "lucide-react";

export type PickedLocation = { lat: number; lng: number; address: string };

const DEFAULT_CENTER: [number, number] = [-1.286389, 36.817223]; // Nairobi

/* ---------- Lazy Leaflet loader (SSR-safe) ---------- */
let leafletPromise: Promise<typeof import("leaflet")> | null = null;

function getLeaflet() {
  if (typeof window === "undefined")
    return Promise.reject(new Error("Leaflet requires a browser"));
  if (!leafletPromise) {
    leafletPromise = import("leaflet").then((mod) => {
      // Also load the CSS
      import("leaflet/dist/leaflet.css");
      const L = mod.default;
      // Fix default icon paths (bundlers break them)
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

/* ---------- Nominatim geocoding (free, no API key) ---------- */
type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

async function searchAddress(query: string): Promise<NominatimResult[]> {
  if (!query.trim()) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) return [];
  return res.json();
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
    });
    if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const data = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

/* ---------- search dropdown ---------- */
function SearchResults({
  results,
  onSelect,
}: {
  results: NominatimResult[];
  onSelect: (r: NominatimResult) => void;
}) {
  if (results.length === 0) return null;
  return (
    <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
      {results.map((r, i) => (
        <li key={`${r.lat}-${r.lon}-${i}`}>
          <button
            type="button"
            className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(r);
            }}
          >
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="line-clamp-2">{r.display_name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ---------- component ---------- */
export function LocationPicker({
  value,
  onChange,
  height = 300,
}: {
  value?: PickedLocation | null;
  onChange: (loc: PickedLocation) => void;
  height?: number;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null); // L.Map
  const markerRef = useRef<any>(null); // L.Marker

  const [address, setAddress] = useState(value?.address ?? "");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Commit a location: move marker, reverse-geocode, emit onChange
  const commit = useCallback(
    async (lat: number, lng: number) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
      mapRef.current?.panTo([lat, lng]);
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
      onChange({ lat, lng, address: addr });
    },
    [onChange],
  );

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    getLeaflet()
      .then((L) => {
        if (cancelled || !mapContainerRef.current || mapRef.current) return;

        const center: [number, number] = value
          ? [value.lat, value.lng]
          : DEFAULT_CENTER;

        const map = L.map(mapContainerRef.current, {
          center,
          zoom: value ? 15 : 12,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker(center, { draggable: true }).addTo(map);
        markerRef.current = marker;
        mapRef.current = map;

        // Click on map → move marker
        map.on("click", (e: any) => {
          commit(e.latlng.lat, e.latlng.lng);
        });

        // Drag marker
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          commit(pos.lat, pos.lng);
        });
      })
      .catch((e) => setMapError(e.message));

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  const handleInputChange = (val: string) => {
    setAddress(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchAddress(val);
      setSearchResults(results);
      setShowResults(true);
      setSearching(false);
    }, 400);
  };

  const handleSelectResult = (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    setAddress(r.display_name);
    setSearchResults([]);
    setShowResults(false);
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    mapRef.current?.setView([lat, lng], 15);
    onChange({ lat, lng, address: r.display_name });
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {searching && (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {!searching && address && (
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          value={address}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder="Search address or click on the map"
          className="pl-9 pr-9"
        />
        {showResults && (
          <SearchResults results={searchResults} onSelect={handleSelectResult} />
        )}
      </div>
      {mapError ? (
        <div className="flex items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          {mapError}
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          style={{ height }}
          className="w-full overflow-hidden rounded-lg border border-border bg-muted"
        />
      )}
      {!mapError && (
        <p className="text-xs text-muted-foreground">
          Tip: click the map or drag the pin to set the exact spot.
        </p>
      )}
    </div>
  );
}
