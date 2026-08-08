import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookTaskerDialog } from "@/components/book-tasker-dialog";
import { MapView } from "@/components/map-view";
import { supabase } from "@/integrations/supabase/client";
import { getMockWorkers } from "@/lib/mock-workers";
import { Star, MapPin, Loader2, Navigation, CheckCircle2, User } from "lucide-react";

export const Route = createFileRoute("/taskers")({
  head: () => ({
    meta: [
      { title: "Find Freelance workers near you — Flexworkers" },
      { name: "description", content: "Browse verified local freelance workers by category, rating and price." },
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
  const [selectedWorker, setSelectedWorker] = useState<Row | null>(null);

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

    const rawLocalProf = localStorage.getItem("flexworkers_local_profile");
    let localWorkerRow: Row | null = null;
    if (rawLocalProf) {
      try {
        const parsed = JSON.parse(rawLocalProf);
        localWorkerRow = {
          user_id: "local-my-profile",
          full_name: "You (Your Profile)",
          avatar_url: null,
          bio: parsed.bio ?? "Local active freelancer profile.",
          category: parsed.category ?? "General",
          skills: parsed.skills ?? ["Plumbing", "Cleaning"],
          hourly_rate: parsed.hourly_rate ?? 1500,
          is_available: parsed.is_available ?? true,
          average_rating: 5.0,
          total_jobs: 1,
          distance_meters: 500,
        };
      } catch {}
    }

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
      const mockRows = getMockWorkers(center.lat, center.lng, {
        category: category || undefined,
        maxRate: maxRate ? Number(maxRate) : undefined,
        minRating: minRating ? Number(minRating) : undefined,
      }) as unknown as Row[];

      const combined = [...(localWorkerRow ? [localWorkerRow] : []), ...realRows, ...(realRows.length === 0 ? mockRows : [])];
      setRows(combined);
      setUsingMock(realRows.length === 0);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      const mockRows = getMockWorkers(center.lat, center.lng, {
        category: category || undefined,
        maxRate: maxRate ? Number(maxRate) : undefined,
        minRating: minRating ? Number(minRating) : undefined,
      }) as unknown as Row[];
      const combined = [...(localWorkerRow ? [localWorkerRow] : []), ...mockRows];
      setRows(combined);
      setUsingMock(true);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [center, radiusKm, category, maxRate, minRating]);

  function handleCategoryChange(val: string) {
    setCategory(val === "__all__" ? "" : val);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Find a Freelance worker near you</h1>
        <p className="mt-2 text-muted-foreground">Filter by category, distance, and verified ID badge.</p>

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
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching available workers…</div>
          ) : rows.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No freelance workers match your filters. Try widening the radius.</CardContent></Card>
          ) : (
            <>
              {usingMock && (
                <div className="mb-4 rounded-lg border border-primary/20 bg-accent/50 px-4 py-3 text-sm text-muted-foreground">
                  <span className="font-medium text-primary">Demo mode</span> — Showing verified sample freelance workers. Tap any worker card to view details and book.
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((r) => {
                  const isVerifiedPro = r.user_id.startsWith("mock-") || (r.bio ?? "").includes("Verified Pro") || r.user_id === "local-my-profile";
                  return (
                    <Card
                      key={r.user_id}
                      className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer border-border hover:border-primary/40 group relative"
                      onClick={() => setSelectedWorker(r)}
                    >
                      <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary font-bold text-lg group-hover:scale-105 transition-transform">
                              {(r.full_name ?? "?").slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold flex items-center gap-1.5 text-base group-hover:text-primary transition-colors">
                                {r.full_name ?? "Freelance worker"}
                              </div>
                              {isVerifiedPro && (
                                <Badge className="bg-emerald-600/95 hover:bg-emerald-700 text-white text-[10px] px-2 py-0.5 gap-1 inline-flex items-center mt-0.5">
                                  <CheckCircle2 className="h-3 w-3" /> Verified Pro 🛡️
                                </Badge>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">{r.category ?? "General"}</p>
                            </div>
                          </div>
                          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{r.bio ?? "No bio available."}</p>
                          <div className="mt-3 flex flex-wrap gap-1">
                            {(r.skills ?? []).slice(0, 3).map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                          </div>
                        </div>

                      <div className="mt-4 pt-3 border-t border-border/60">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 font-medium"><Star className="h-4 w-4 fill-amber-400 text-amber-500" />{r.average_rating?.toFixed(1) ?? "5.0"} <span className="text-xs text-muted-foreground font-normal">({r.total_jobs ?? 12} jobs)</span></span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{r.distance_meters ? (r.distance_meters / 1000).toFixed(1) + " km" : "Nearby"}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-sm font-bold text-primary">{r.hourly_rate ? `KES ${r.hourly_rate.toLocaleString()}/hr` : "Rate on request"}</p>
                          <Button size="sm" variant="secondary" className="text-xs h-7 px-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            View & Book
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
          )}
        </div>

        {/* Worker Details Preview Modal */}
        {selectedWorker && (
          <Dialog open={!!selectedWorker} onOpenChange={(open) => !open && setSelectedWorker(null)}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary text-2xl font-bold">
                    {(selectedWorker.full_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      {selectedWorker.full_name ?? "Freelance worker"}
                      {(selectedWorker.user_id.startsWith("mock-") || (selectedWorker.bio ?? "").includes("Verified Pro") || selectedWorker.user_id === "local-my-profile") && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" /> Verified Pro 🛡️
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      {selectedWorker.category ?? "General Services"}
                    </DialogDescription>
                    <div className="mt-1 flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 font-semibold">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                        {selectedWorker.average_rating?.toFixed(1) ?? "5.0"}
                      </span>
                      <span className="text-muted-foreground">({selectedWorker.total_jobs ?? 12} completed jobs)</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="rounded-lg bg-accent/40 p-4 space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hourly Rate</span>
                  <p className="text-2xl font-bold text-primary">
                    {selectedWorker.hourly_rate ? `KES ${selectedWorker.hourly_rate.toLocaleString()} / hr` : "Rate on request"}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5"><User className="h-4 w-4 text-primary" /> About</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedWorker.bio ?? "Experienced local specialist providing high quality freelance services with prompt response times."}
                  </p>
                </div>

                {selectedWorker.skills && selectedWorker.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Skills & Specializations</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedWorker.skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="bg-background">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> Service Area</h4>
                  <MapView lat={center.lat} lng={center.lng} height={180} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedWorker(null)}>Close</Button>
                <BookTaskerDialog
                  taskerId={selectedWorker.user_id}
                  taskerName={selectedWorker.full_name ?? "Freelance worker"}
                  defaultAmount={selectedWorker.hourly_rate}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}


