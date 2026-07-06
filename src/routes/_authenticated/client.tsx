import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus, Users, Star, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/client")({
  head: () => ({ meta: [{ title: "Client dashboard — Flexworkers" }] }),
  component: ClientDashboard,
});

type Job = { id: string; title: string; category: string; status: string; location_address: string | null; created_at: string };

function ClientDashboard() {
  const { user } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("jobs").select("id, title, category, status, location_address, created_at").eq("client_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setJobs((data ?? []) as Job[]); setLoading(false); });
  }, [user]);

  const active = jobs.filter((j) => j.status !== "completed" && j.status !== "cancelled").length;

  return (
    <main className="container mx-auto px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome{user?.email ? `, ${user.email.split("@")[0]}` : ""}</p>
          <h1 className="text-3xl font-bold tracking-tight">Client dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/taskers">Browse taskers</Link></Button>
          <Button asChild size="lg"><Link to="/post-job"><Plus className="mr-2 h-4 w-4" /> Post a job</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Briefcase className="h-5 w-5" />} label="Active jobs" value={String(active)} />
        <StatCard icon={<Users className="h-5 w-5" />} label="Total jobs" value={String(jobs.length)} />
        <StatCard icon={<Star className="h-5 w-5" />} label="Reviews left" value="0" />
      </div>

      <Card className="mt-8">
        <CardHeader><CardTitle>Your jobs</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-muted-foreground">Loading…</p>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="rounded-full bg-accent p-4 text-primary"><Briefcase className="h-6 w-6" /></div>
              <p className="font-medium">No jobs yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">Post your first task and get matched with nearby taskers.</p>
              <Button asChild className="mt-2"><Link to="/post-job">Post a job</Link></Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {jobs.map((j) => (
                <li key={j.id}>
                  <Link to="/job/$jobId" params={{ jobId: j.id }} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-accent/40">
                    <div>
                      <p className="font-medium">{j.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Badge variant="secondary">{j.category}</Badge>
                        {j.location_address && <><MapPin className="h-3 w-3" />{j.location_address}</>}
                      </p>
                    </div>
                    <Badge variant={j.status === "open" ? "default" : "outline"}>{j.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-primary">{icon}</span>
        <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div>
      </CardContent>
    </Card>
  );
}
