// Lazy Google Maps JS API loader
let promise: Promise<typeof google> | null = null;

export class GoogleMapsLoadError extends Error {
  public readonly reason:
    | "missing_key"
    | "network"
    | "auth_failure"
    | "unknown";

  constructor(
    message: string,
    reason: GoogleMapsLoadError["reason"] = "unknown",
  ) {
    super(message);
    this.name = "GoogleMapsLoadError";
    this.reason = reason;
  }
}

// Auth failure can fire AFTER the script loads and the promise resolves,
// so we expose an event emitter that consumers can subscribe to.
type AuthFailureListener = (error: GoogleMapsLoadError) => void;
const authFailureListeners = new Set<AuthFailureListener>();

export function onGoogleMapsAuthFailure(listener: AuthFailureListener) {
  authFailureListeners.add(listener);
  return () => { authFailureListeners.delete(listener); };
}

function fireAuthFailure() {
  const error = new GoogleMapsLoadError(
    "Google Maps authentication failed. Check that your API key is valid, billing is enabled, and the Maps JavaScript API, Places API, and Geocoding API are all enabled in the Google Cloud Console.",
    "auth_failure",
  );
  authFailureListeners.forEach((fn) => fn(error));
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined")
    return Promise.reject(new GoogleMapsLoadError("SSR", "unknown"));
  if ((window as any).google?.maps?.places)
    return Promise.resolve((window as any).google);
  if (promise) return promise;

  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
  const channel = import.meta.env.VITE_GOOGLE_MAPS_CHANNEL as string;

  if (!key) {
    return Promise.reject(
      new GoogleMapsLoadError(
        "Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY in your .env file.",
        "missing_key",
      ),
    );
  }

  // Wire up Google's global auth failure callback.
  // It may fire before OR after the callback promise resolves.
  let promiseReject: ((e: GoogleMapsLoadError) => void) | null = null;

  (window as any).gm_authFailure = () => {
    const err = new GoogleMapsLoadError(
      "Google Maps authentication failed. Check that your API key is valid, billing is enabled, and the Maps JavaScript API, Places API, and Geocoding API are all enabled in the Google Cloud Console.",
      "auth_failure",
    );
    // If the promise hasn't resolved yet, reject it directly
    if (promiseReject) {
      promise = null;
      promiseReject(err);
      promiseReject = null;
    }
    // Always notify listeners (component may already be mounted)
    fireAuthFailure();
  };

  promise = new Promise((resolve, reject) => {
    promiseReject = reject;

    (window as any).__initGoogleMaps = () => {
      promiseReject = null; // promise resolved, further auth errors go via listeners
      resolve((window as any).google);
    };

    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&libraries=places&callback=__initGoogleMaps${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      promise = null;
      promiseReject = null;
      reject(
        new GoogleMapsLoadError(
          "Failed to load the Google Maps script. Check your network connection.",
          "network",
        ),
      );
    };
    document.head.appendChild(s);
  });
  return promise;
}
