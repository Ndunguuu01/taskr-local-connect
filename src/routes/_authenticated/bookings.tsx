import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Briefcase } from "lucide-react";

import { LocalStore } from "@/lib/local-store";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({ meta: [{ title: "My bookings — Flexworkers" }] }),
  component: BookingsPage,
});

type Row = {
  id: string;
  job_title: string;
  status: string;
  amount: number | null;
  scheduled_date: string | null;
  created_at: string;
  client_name: string | null;
  tasker_name: string | null;
  role: "client" | "tasker";
};

function BookingsPage() {
  const { user } = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let remoteRows: Row[] = [];
      if (user) {
        try {
          const { data } = await (supabase.rpc as any)("get_my_bookings");
          if (data) remoteRows = data as Row[];
        } catch {}
      }

      const localBookings = LocalStore.getBookings().map((b) => {
        const matchingJob = LocalStore.getJobs().find((j) => j.id === b.job_id);
        return {
          id: b.id,
          job_title: matchingJob?.title ?? "Freelance Job Booking",
          status: b.status,
          amount: b.amount,
          scheduled_date: b.scheduled_date,
          created_at: b.created_at,
          client_name: "Client",
          tasker_name: "Freelance worker",
          role: "client" as const,
        };
      });

      const map = new Map<string, Row>();
      [...localBookings, ...remoteRows].forEach((r) => map.set(r.id, r));
      const sorted = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRows(sorted);
      setLoading(false);
    })();
  }, [user]);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Bookings</h1>
      <Card>
        <CardHeader><CardTitle>All bookings</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="rounded-full bg-accent p-4 text-primary"><Briefcase className="h-6 w-6" /></div>
              <p className="font-medium">No bookings yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">Once a client books you or you book a tasker, it will show up here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((b) => (
                <li key={b.id}>
                  <Link to="/booking/$bookingId" params={{ bookingId: b.id }} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-accent/40">
                    <div>
                      <p className="font-medium">{b.job_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.role === "client" ? `Tasker: ${b.tasker_name ?? "—"}` : `Client: ${b.client_name ?? "—"}`}
                        {b.amount ? ` · KES ${b.amount}` : ""}
                      </p>
                    </div>
                    <Badge variant={b.status === "completed" ? "outline" : "default"}>{b.status}</Badge>
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
