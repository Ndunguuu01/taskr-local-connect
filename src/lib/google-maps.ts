// Lazy Google Maps JS API loader
let promise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if ((window as any).google?.maps?.places) return Promise.resolve((window as any).google);
  if (promise) return promise;

  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
  const channel = import.meta.env.VITE_GOOGLE_MAPS_CHANNEL as string;

  promise = new Promise((resolve, reject) => {
    (window as any).__initGoogleMaps = () => resolve((window as any).google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&libraries=places&callback=__initGoogleMaps${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return promise;
}
