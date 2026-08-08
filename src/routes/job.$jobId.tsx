import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/map-view";
import { supabase } from "@/integrations/supabase/client";
import { getMockWorkers } from "@/lib/mock-workers";
import { MapPin, Calendar, Wallet, Star, Users, Loader2 } from "lucide-react";

import { LocalStore } from "@/lib/local-store";

export const Route = createFileRoute("/job/$jobId")({
  loader: async ({ params }) => {
    try {
      const { data } = await (supabase.rpc as any)("get_job_public", { _job_id: params.jobId });
      const row = Array.isArray(data) ? data[0] : null;
      if (row) return row;
    } catch {}

    const localJob = LocalStore.getJobs().find((j) => j.id === params.jobId);
    if (localJob) {
      return {
        id: localJob.id,
        title: localJob.title,
        description: localJob.description,
        category: localJob.category,
        budget: localJob.budget,
        location_address: localJob.location_address,
        lat: localJob.lat,
        lng: localJob.lng,
        status: localJob.status,
        scheduled_date: localJob.scheduled_date,
        client_name: localJob.client_name ?? "Client",
      };
    }
    throw notFound();
  },
  head: ({ loaderData }: any) => ({
    meta: [
      { title: `${loaderData?.title ?? "Job"} — Flexworkers` },
      { name: "description", content: loaderData?.description?.slice(0, 150) ?? "Job listing on Flexworkers." },
    ],
  }),
  errorComponent: () => <p className="p-8 text-center text-muted-foreground">Could not load this job.</p>,
  notFoundComponent: () => <p className="p-8 text-center text-muted-foreground">Job not found.</p>,
  component: JobDetail,
});

type NearbyWorker = {
  user_id: string;
  full_name: string | null;
  category: string | null;
  hourly_rate: number | null;
  average_rating: number;
  total_jobs: number;
  distance_meters: number;
  is_available: boolean;
};

function JobDetail() {
  const j = Route.useLoaderData() as any;
  const [nearbyWorkers, setNearbyWorkers] = useState<NearbyWorker[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    if (j.lat == null || j.lng == null) {
      setNearbyLoading(false);
      return;
    }
    (supabase.rpc as any)("nearby_taskers", {
      _lat: j.lat,
      _lng: j.lng,
      _radius_m: 25000,
      _category: j.category || null,
    }).then(({ data }: { data: NearbyWorker[] | null }) => {
      const real = (data ?? []).filter((w) => w.is_available).slice(0, 5);
      if (real.length > 0) {
        setNearbyWorkers(real);
        setUsingMock(false);
      } else {
        // Fall back to mock workers filtered by job category
        const mocks = getMockWorkers(j.lat, j.lng, { category: j.category || undefined })
          .slice(0, 5) as unknown as NearbyWorker[];
        setNearbyWorkers(mocks);
        setUsingMock(true);
      }
      setNearbyLoading(false);
    });
  }, [j.lat, j.lng, j.category]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{j.category}</Badge>
              <Badge variant={j.status === "open" ? "default" : "outline"}>{j.status}</Badge>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{j.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Posted by {j.client_name ?? "a client"}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{j.description}</p></CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-5 text-sm">
                {j.budget != null && <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Budget: <span className="font-medium">KES {j.budget}</span></div>}
                {j.scheduled_date && <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> {new Date(j.scheduled_date).toLocaleString()}</div>}
                {j.location_address && <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" /> <span>{j.location_address}</span></div>}
              </CardContent>
            </Card>
            {j.lat != null && j.lng != null && (
              <Card>
                <CardHeader><CardTitle>Location</CardTitle></CardHeader>
                <CardContent><MapView lat={j.lat} lng={j.lng} /></CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Nearby workers section */}
        {j.lat != null && j.lng != null && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Available workers nearby
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nearbyLoading ? (
                <div className="flex items-center gap-2 py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Finding workers near this job…
                </div>
              ) : nearbyWorkers.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No available workers found near this location. Try browsing all{" "}
                  <Link to="/taskers" className="text-primary hover:underline">taskers</Link>.
                </p>
              ) : (
                <>
                  {usingMock && (
                    <div className="mb-4 rounded-lg border border-primary/20 bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-primary">Demo</span> — Sample workers shown. Real workers appear as they join.
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {nearbyWorkers.map((w) => (
                      <Link
                        key={w.user_id}
                        to={w.user_id.startsWith("mock-") ? "/taskers" : "/tasker/$userId"}
                        params={{ userId: w.user_id }}
                      >
                        <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/40">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary font-semibold">
                            {(w.full_name ?? "?").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium flex items-center gap-1.5">
                              {w.full_name ?? "Tasker"}
                              {w.user_id.startsWith("mock-") && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0">Demo</Badge>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                {w.average_rating?.toFixed(1) ?? "—"}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" />
                                {(w.distance_meters / 1000).toFixed(1)} km
                              </span>
                              {w.hourly_rate && <span>KES {w.hourly_rate}/hr</span>}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

