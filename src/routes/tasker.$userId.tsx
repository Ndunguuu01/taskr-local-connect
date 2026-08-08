import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/map-view";
import { BookTaskerDialog } from "@/components/book-tasker-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Star, MapPin } from "lucide-react";

export const Route = createFileRoute("/tasker/$userId")({
  loader: async ({ params }) => {
    try {
      const { data } = await (supabase.rpc as any)("get_tasker_public", { _user_id: params.userId });
      const row = Array.isArray(data) ? data[0] : null;
      if (row) return row;
    } catch {}

    const rawLocalProf = localStorage.getItem("flexworkers_local_profile");
    if (rawLocalProf || params.userId === "local-my-profile") {
      const parsed = rawLocalProf ? JSON.parse(rawLocalProf) : {};
      return {
        user_id: params.userId,
        full_name: "You (Freelance Worker)",
        category: parsed.category ?? "General",
        bio: parsed.bio ?? "Active local freelance worker profile.",
        skills: parsed.skills ?? ["Plumbing", "Cleaning"],
        hourly_rate: parsed.hourly_rate ?? 1500,
        average_rating: 5.0,
        total_jobs: 1,
        is_available: parsed.is_available ?? true,
        location_address: parsed.location_address ?? "Nairobi",
        lat: parsed.lat ?? -1.286389,
        lng: parsed.lng ?? 36.817223,
      };
    }

    throw notFound();
  },
  head: ({ loaderData }: any) => ({
    meta: [
      { title: `${loaderData?.full_name ?? "Freelance worker"} — Flexworkers` },
      { name: "description", content: loaderData?.bio?.slice(0, 150) ?? "Verified freelance worker on Flexworkers." },
    ],
  }),
  errorComponent: () => <p className="p-8 text-center text-muted-foreground">Could not load this profile.</p>,
  notFoundComponent: () => <p className="p-8 text-center text-muted-foreground">Freelance worker not found.</p>,
  component: TaskerProfile,
});

function TaskerProfile() {
  const t = Route.useLoaderData() as any;
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-primary">
            {(t.full_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{t.full_name ?? "Tasker"}</h1>
            <p className="text-muted-foreground">{t.category ?? "General"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />{t.average_rating?.toFixed(1) ?? "—"} <span className="text-muted-foreground">({t.total_jobs} jobs)</span></span>
              {t.location_address && <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{t.location_address}</span>}
              {!t.is_available && <Badge variant="outline">Currently unavailable</Badge>}
            </div>
          </div>
          <BookTaskerDialog taskerId={t.user_id} taskerName={t.full_name} defaultAmount={t.hourly_rate} />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>About</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.bio || "No bio yet."}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(t.skills ?? []).length ? (t.skills as string[]).map((s) => <Badge key={s} variant="secondary">{s}</Badge>) : <p className="text-sm text-muted-foreground">No skills listed.</p>}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Rate</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-semibold">{t.hourly_rate ? `KES ${t.hourly_rate}` : "On request"}{t.hourly_rate && <span className="text-sm font-normal text-muted-foreground">/hr</span>}</p></CardContent>
            </Card>
            {t.lat != null && t.lng != null && (
              <Card>
                <CardHeader><CardTitle>Service area</CardTitle></CardHeader>
                <CardContent><MapView lat={t.lat} lng={t.lng} /></CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
