import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Wrench, Star, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tasker")({
  head: () => ({ meta: [{ title: "Tasker dashboard — Flexworkers" }] }),
  component: TaskerDashboard,
});

function TaskerDashboard() {
  const { user } = useSession();
  return (
    <main className="container mx-auto px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome{user?.email ? `, ${user.email.split("@")[0]}` : ""}</p>
          <h1 className="text-3xl font-bold tracking-tight">Tasker dashboard</h1>
        </div>
        <Button size="lg" variant="outline" disabled>
          <User className="mr-2 h-4 w-4" /> Edit profile
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Wrench className="h-5 w-5" />} label="Active jobs" value="0" />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Earnings" value="KES 0" />
        <StatCard icon={<Star className="h-5 w-5" />} label="Rating" value="—" />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Nearby jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="rounded-full bg-accent p-4 text-primary">
              <Wrench className="h-6 w-6" />
            </div>
            <p className="font-medium">Set up your profile</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add your skills, hourly rate and location to start receiving job offers nearby.
            </p>
            <p className="text-xs text-muted-foreground">Profile editor coming in the next update.</p>
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
