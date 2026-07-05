import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus, Users, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/client")({
  head: () => ({ meta: [{ title: "Client dashboard — Flexworkers" }] }),
  component: ClientDashboard,
});

function ClientDashboard() {
  const { user } = useSession();
  return (
    <main className="container mx-auto px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome{user?.email ? `, ${user.email.split("@")[0]}` : ""}</p>
          <h1 className="text-3xl font-bold tracking-tight">Client dashboard</h1>
        </div>
        <Button size="lg" disabled>
          <Plus className="mr-2 h-4 w-4" /> Post a job
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Briefcase className="h-5 w-5" />} label="Active jobs" value="0" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Taskers hired" value="0" />
        <StatCard icon={<Star className="h-5 w-5" />} label="Reviews left" value="0" />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Your jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="rounded-full bg-accent p-4 text-primary">
              <Briefcase className="h-6 w-6" />
            </div>
            <p className="font-medium">No jobs yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Post your first task and get matched with nearby taskers in minutes.
            </p>
            <p className="text-xs text-muted-foreground">Job posting coming in the next update.</p>
          </div>
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
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
