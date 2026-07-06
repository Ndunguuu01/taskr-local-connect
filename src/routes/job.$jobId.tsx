import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/map-view";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Wallet } from "lucide-react";

export const Route = createFileRoute("/job/$jobId")({
  loader: async ({ params }) => {
    const { data } = await (supabase.rpc as any)("get_job_public", { _job_id: params.jobId });
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) throw notFound();
    return row;
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

function JobDetail() {
  const j = Route.useLoaderData() as any;
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
      </main>
    </div>
  );
}
