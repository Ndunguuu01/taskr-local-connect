import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getMockWorkers, type MockWorker } from "@/lib/mock-workers";
import { Star, MapPin, Loader2, Navigation } from "lucide-react";

export const Route = createFileRoute("/taskers")({
  head: () => ({
    meta: [
      { title: "Find taskers near you — Flexworkers" },
      { name: "description", content: "Browse verified local taskers by category, rating and price." },
    ],
  }),
  component: TaskersPage,
});

const CATEGORIES = ["", "Cleaning", "Plumbing", "Electrical", "TV Mounting", "Painting", "Moving", "Handyman", "Other"];
const DEFAULT = { lat: -1.286389, lng: 36.817223 };

type Row = {
  user_id: string; full_name: string | null; avatar_url: string | null;
  bio: string | null; category: string | null; skills: string[];
  hourly_rate: number | null; is_available: boolean; average_rating: number;
  total_jobs: number; distance_meters: number;
};

function TaskersPage() {
  const [center, setCenter] = useState(DEFAULT);
  const [locationDetected, setLocationDetected] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [category, setCategory] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [minRating, setMinRating] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [usingMock, setUsingMock] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setCenter({ lat: p.coords.latitude, lng: p.coords.longitude });
          setLocationDetected(true);
        },
        () => {},
        { timeout: 3000 },
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (supabase.rpc as any)("nearby_taskers", {
      _lat: center.lat,
      _lng: center.lng,
      _radius_m: radiusKm * 1000,
      _category: category || null,
      _max_rate: maxRate ? Number(maxRate) : null,
      _min_rating: minRating ? Number(minRating) : null,
    }).then(({ data }: { data: Row[] | null }) => {
      if (cancelled) return;
      const realRows = data ?? [];
      if (realRows.length > 0) {
        setRows(realRows);
        setUsingMock(false);
      } else {
        // Fall back to mock workers for demo purposes
        const mockRows = getMockWorkers(center.lat, center.lng, {
          category: category || undefined,
          maxRate: maxRate ? Number(maxRate) : undefined,
          minRating: minRating ? Number(minRating) : undefined,
        }) as unknown as Row[];
        setRows(mockRows);
        setUsingMock(true);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [center, radiusKm, category, maxRate, minRating]);

  function handleCategoryChange(val: string) {
    // "__all__" sentinel → reset to empty string (no filter)
    setCategory(val === "__all__" ? "" : val);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Find a tasker near you</h1>
        <p className="mt-2 text-muted-foreground">Filter by category, distance and rate.</p>

        {/* Location indicator */}
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Navigation className="h-3.5 w-3.5 text-primary" />
          {locationDetected
            ? "Searching near your current location"
            : "Searching near Nairobi CBD (allow location access for better results)"}
        </div>

        <Card className="mt-4">
          <CardContent className="grid gap-4 p-4 md:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={category || "__all__"} onValueChange={handleCategoryChange}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c || "all"} value={c || "__all__"}>{c || "All categories"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Radius (km)</Label>
              <Input type="number" min={1} value={radiusKm} onChange={(e) => setRadiusKm(Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max rate (KES/hr)</Label>
              <Input type="number" min={0} value={maxRate} onChange={(e) => setMaxRate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Min rating</Label>
              <Input type="number" min={0} max={5} step="0.1" value={minRating} onChange={(e) => setMinRating(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={() => { setCategory(""); setMaxRate(""); setMinRating(""); setRadiusKm(25); }}>Reset</Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</div>
          ) : rows.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No taskers match your filters. Try widening the radius.</CardContent></Card>
          ) : (
            <>
              {usingMock && (
                <div className="mb-4 rounded-lg border border-primary/20 bg-accent/50 px-4 py-3 text-sm text-muted-foreground">
                  <span className="font-medium text-primary">Demo mode</span> — Showing sample workers. Real workers will appear as they join the platform.
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rows.map((r) => (
                  <Link key={r.user_id} to={r.user_id.startsWith("mock-") ? "/taskers" : "/tasker/$userId"} params={{ userId: r.user_id }}>
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary font-semibold">
                            {(r.full_name ?? "?").slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              {r.full_name ?? "Tasker"}
                              {r.user_id.startsWith("mock-") && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Demo</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{r.category ?? "General"}</p>
                          </div>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{r.bio ?? "No bio yet."}</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {(r.skills ?? []).slice(0, 3).map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />{r.average_rating?.toFixed(1) ?? "—"} <span className="text-muted-foreground">({r.total_jobs})</span></span>
                          <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{(r.distance_meters / 1000).toFixed(1)} km</span>
                        </div>
                        <p className="mt-2 text-sm font-medium">{r.hourly_rate ? `KES ${r.hourly_rate}/hr` : "Rate on request"}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

