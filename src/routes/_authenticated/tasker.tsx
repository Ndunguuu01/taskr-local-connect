import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Wrench, Star, User, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LocalStore } from "@/lib/local-store";

export const Route = createFileRoute("/_authenticated/tasker")({
  head: () => ({ meta: [{ title: "Freelance worker dashboard — Flexworkers" }] }),
  component: TaskerDashboard,
});

type NearbyJob = { user_id: string };
type Profile = { lat: number | null; lng: number | null; average_rating: number; total_jobs: number; total_earnings?: number; is_available: boolean; location_address: string | null };

function TaskerDashboard() {
  const { user } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let p: Profile | null = null;
      if (user) {
        try {
          const { data } = await (supabase.rpc as any)("get_tasker_public", { _user_id: user.id });
          p = Array.isArray(data) ? data[0] : null;
        } catch {}
      }

      if (!p) {
        const rawLocal = localStorage.getItem("flexworkers_local_profile");
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          p = {
            lat: parsed.lat ?? -1.286389,
            lng: parsed.lng ?? 36.817223,
            average_rating: 5.0,
            total_jobs: 1,
            is_available: parsed.is_available ?? true,
            location_address: parsed.location_address ?? "Nairobi",
          };
        }
      }

      setProfile(p);
      
      // Fetch open jobs from Supabase + LocalStore
      let openJobs: any[] = [];
      try {
        const { data: jd } = await (supabase.from("jobs") as any)
          .select("id, title, category, status, location_address, budget, created_at")
          .eq("status", "open")
          .order("created_at", { ascending: false });
        if (jd) openJobs = jd;
      } catch {}

      const localJobs = LocalStore.getJobs().filter((j) => j.status === "open");
      const jobMap = new Map<string, any>();
      [...localJobs, ...openJobs].forEach((j) => jobMap.set(j.id, j));
      setJobs(Array.from(jobMap.values()));
      setLoading(false);
    })();
  }, [user]);

  return (
    <main className="container mx-auto px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome{user?.email ? `, ${user.email.split("@")[0]}` : ""}</p>
          <h1 className="text-3xl font-bold tracking-tight">Freelance worker dashboard</h1>
        </div>
        <Button asChild size="lg" variant="outline"><Link to="/edit-profile"><User className="mr-2 h-4 w-4" /> {profile ? "Edit profile" : "Create profile"}</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Wrench className="h-5 w-5" />} label="Total jobs" value={String(profile?.total_jobs ?? 0)} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Availability" value={profile?.is_available ? "Available" : "Off"} />
        <StatCard icon={<Star className="h-5 w-5" />} label="Rating" value={profile?.average_rating ? profile.average_rating.toFixed(1) : "—"} />
      </div>

      <Card className="mt-8">
        <CardHeader><CardTitle>Open jobs</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="py-6 text-center text-muted-foreground">Loading…</p>
            : !profile ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="rounded-full bg-accent p-4 text-primary"><Wrench className="h-6 w-6" /></div>
                <p className="font-medium">Set up your profile</p>
                <p className="max-w-sm text-sm text-muted-foreground">Add your skills, hourly rate and location to start receiving job offers.</p>
                <Button asChild className="mt-2"><Link to="/edit-profile">Create profile</Link></Button>
              </div>
            ) : jobs.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No open jobs right now. Check back soon.</p>
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
                      {j.budget && <span className="text-sm font-medium">KES {j.budget}</span>}
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
