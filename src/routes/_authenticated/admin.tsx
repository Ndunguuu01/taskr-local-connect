import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Shield, Users, Briefcase, CalendarCheck, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Flexworkers" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type Stats = {
  users: number; suspended: number; taskers: number; clients: number;
  jobs: number; open_jobs: number; bookings: number; completed_bookings: number; reviews: number;
};

type AdminUser = {
  id: string; full_name: string | null; email: string | null; phone: string | null;
  is_suspended: boolean; created_at: string; roles: string[];
};

type AdminJob = {
  id: string; title: string; category: string; status: string;
  location_address: string | null; created_at: string; client_id: string;
};

type AdminBooking = {
  id: string; status: string; payment_status: string; amount: number | null;
  created_at: string; client_id: string; tasker_id: string; job_id: string;
};

function AdminPage() {
  const { isAdmin, loading } = useSession();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) { navigate({ to: "/" }); return; }
    refresh();
  }, [isAdmin, loading]);

  async function refresh() {
    setBusy(true);
    const [s, u, j, b] = await Promise.all([
      (supabase.rpc as any)("admin_stats"),
      (supabase.rpc as any)("admin_list_users"),
      supabase.from("jobs").select("id,title,category,status,location_address,created_at,client_id").order("created_at", { ascending: false }).limit(200),
      supabase.from("bookings").select("id,status,payment_status,amount,created_at,client_id,tasker_id,job_id").order("created_at", { ascending: false }).limit(200),
    ]);
    if (s.data) setStats(s.data as Stats);
    if (u.data) setUsers(u.data as AdminUser[]);
    if (j.data) setJobs(j.data as AdminJob[]);
    if (b.data) setBookings(b.data as AdminBooking[]);
    setBusy(false);
  }

  async function toggleSuspend(u: AdminUser) {
    const { error } = await (supabase.rpc as any)("admin_set_suspended", { _user_id: u.id, _suspended: !u.is_suspended });
    if (error) return toast.error(error.message);
    toast.success(u.is_suspended ? "User reinstated" : "User suspended");
    refresh();
  }

  async function toggleRole(u: AdminUser, role: "client" | "tasker" | "admin") {
    const has = u.roles.includes(role);
    const fn = has ? "admin_revoke_role" : "admin_grant_role";
    const { error } = await (supabase.rpc as any)(fn, { _user_id: u.id, _role: role });
    if (error) return toast.error(error.message);
    toast.success(`${has ? "Removed" : "Granted"} ${role}`);
    refresh();
  }

  async function deleteJob(id: string) {
    if (!confirm("Delete this job? This cannot be undone.")) return;
    const { error } = await (supabase.rpc as any)("admin_delete_job", { _job_id: id });
    if (error) return toast.error(error.message);
    toast.success("Job deleted");
    refresh();
  }

  async function cancelBooking(id: string) {
    if (!confirm("Cancel this booking?")) return;
    const { error } = await (supabase.rpc as any)("admin_cancel_booking", { _booking_id: id });
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled");
    refresh();
  }

  if (loading || (isAdmin && !stats && busy)) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Users" value={stats?.users ?? 0} sub={`${stats?.suspended ?? 0} suspended`} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Taskers / Clients" value={`${stats?.taskers ?? 0} / ${stats?.clients ?? 0}`} />
        <StatCard icon={<Briefcase className="h-4 w-4" />} label="Jobs" value={stats?.jobs ?? 0} sub={`${stats?.open_jobs ?? 0} open`} />
        <StatCard icon={<CalendarCheck className="h-4 w-4" />} label="Bookings" value={stats?.bookings ?? 0} sub={`${stats?.completed_bookings ?? 0} completed`} />
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(["client", "tasker", "admin"] as const).map((r) => (
                            <button key={r} onClick={() => toggleRole(u, r)}>
                              <Badge variant={u.roles.includes(r) ? "default" : "outline"} className="cursor-pointer">
                                {r}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.is_suspended
                          ? <Badge variant="destructive">Suspended</Badge>
                          : <Badge variant="secondary">Active</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={u.is_suspended ? "outline" : "destructive"} onClick={() => toggleSuspend(u)}>
                          {u.is_suspended ? "Reinstate" : "Suspend"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No users yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium">
                        <Link to="/job/$jobId" params={{ jobId: j.id }} className="hover:underline">{j.title}</Link>
                      </TableCell>
                      <TableCell><Badge variant="outline">{j.category}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{j.location_address ?? "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{j.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{new Date(j.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="destructive" onClick={() => deleteJob(j.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {jobs.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No jobs yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">
                        <Link to="/booking/$bookingId" params={{ bookingId: b.id }} className="hover:underline">
                          {b.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{b.status}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{b.payment_status}</Badge></TableCell>
                      <TableCell>{b.amount ? `KES ${b.amount}` : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="destructive" disabled={b.status === "cancelled"} onClick={() => cancelBooking(b.id)}>
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {bookings.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No bookings yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="h-3 w-3" /> {stats?.reviews ?? 0} reviews on the platform.
      </p>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
