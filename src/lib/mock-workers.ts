// 5 realistic mock workers placed around Nairobi for demo/fallback purposes.
// Used when the nearby_taskers RPC returns no results.

export type MockWorker = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  category: string;
  skills: string[];
  hourly_rate: number;
  is_available: boolean;
  average_rating: number;
  total_jobs: number;
  lat: number;
  lng: number;
  distance_meters: number;
};

const RAW_WORKERS: Omit<MockWorker, "distance_meters">[] = [
  {
    user_id: "mock-001-james-mwangi",
    full_name: "James Mwangi",
    avatar_url: null,
    bio: "Licensed plumber with 8+ years of experience in residential and commercial plumbing. Specialising in pipe fitting, water heater installations, and drainage systems across Westlands and surrounding areas.",
    category: "Plumbing",
    skills: ["Pipe fitting", "Leak repair", "Water heater", "Drainage"],
    hourly_rate: 800,
    is_available: true,
    average_rating: 4.8,
    total_jobs: 142,
    lat: -1.2673,
    lng: 36.8114, // Westlands
  },
  {
    user_id: "mock-002-grace-wanjiku",
    full_name: "Grace Wanjiku",
    avatar_url: null,
    bio: "Professional cleaner offering deep cleaning, move-in/move-out cleaning, and regular housekeeping. I bring my own eco-friendly supplies. Available weekdays and Saturdays in the Kilimani area.",
    category: "Cleaning",
    skills: ["Deep cleaning", "Move-in/move-out", "Laundry", "Office cleaning"],
    hourly_rate: 500,
    is_available: true,
    average_rating: 4.9,
    total_jobs: 218,
    lat: -1.2891,
    lng: 36.7863, // Kilimani
  },
  {
    user_id: "mock-003-peter-ochieng",
    full_name: "Peter Ochieng",
    avatar_url: null,
    bio: "Certified electrician (KPLC approved) with expertise in wiring, circuit breaker installation, solar panel setup, and electrical troubleshooting. Serving Karen, Langata, and Nairobi CBD.",
    category: "Electrical",
    skills: ["Wiring", "Circuit breakers", "Solar panels", "Troubleshooting"],
    hourly_rate: 1000,
    is_available: true,
    average_rating: 4.7,
    total_jobs: 97,
    lat: -1.3184,
    lng: 36.7112, // Karen
  },
  {
    user_id: "mock-004-amina-hassan",
    full_name: "Amina Hassan",
    avatar_url: null,
    bio: "Creative painter with an eye for detail. Interior and exterior painting, wallpaper installation, and colour consultation. I use premium paints and take pride in leaving a spotless workspace.",
    category: "Painting",
    skills: ["Interior painting", "Exterior painting", "Wallpaper", "Colour consultation"],
    hourly_rate: 600,
    is_available: true,
    average_rating: 4.6,
    total_jobs: 63,
    lat: -1.2782,
    lng: 36.7743, // Lavington
  },
  {
    user_id: "mock-005-david-kimathi",
    full_name: "David Kimathi",
    avatar_url: null,
    bio: "All-round handyman — furniture assembly, TV mounting, shelf installation, minor repairs, and odd jobs. Fast, reliable, and friendly. Based in Nairobi CBD, happy to travel within 15 km.",
    category: "Handyman",
    skills: ["TV mounting", "Furniture assembly", "Shelf installation", "Minor repairs"],
    hourly_rate: 700,
    is_available: true,
    average_rating: 4.5,
    total_jobs: 185,
    lat: -1.2864,
    lng: 36.8172, // CBD
  },
];

/** Haversine distance in metres between two lat/lng pairs. */
function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Return the 5 mock workers sorted by distance from the given centre.
 * Optionally filter by category and max rate.
 */
export function getMockWorkers(
  centerLat: number,
  centerLng: number,
  opts?: { category?: string; maxRate?: number; minRating?: number },
): MockWorker[] {
  return RAW_WORKERS.map((w) => ({
    ...w,
    distance_meters: haversineMeters(centerLat, centerLng, w.lat, w.lng),
  }))
    .filter((w) => {
      if (opts?.category && w.category !== opts.category) return false;
      if (opts?.maxRate && w.hourly_rate > opts.maxRate) return false;
      if (opts?.minRating && w.average_rating < opts.minRating) return false;
      return true;
    })
    .sort((a, b) => a.distance_meters - b.distance_meters);
}
