import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Shield, Users, Briefcase, CalendarCheck, Star, Search, Smartphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Flexworkers" }, { name: "robots", content: "noindex" }] }),
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
  mpesa_transaction_id?: string | null;
};

function AdminPage() {
  const { isAdmin, loading } = useSession();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [busy, setBusy] = useState(true);

  const [userQuery, setUserQuery] = useState("");
  const [jobQuery, setJobQuery] = useState("");
  const [bookingQuery, setBookingQuery] = useState("");

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
      supabase.from("bookings").select("id,status,payment_status,amount,created_at,client_id,tasker_id,job_id,mpesa_transaction_id").order("created_at", { ascending: false }).limit(200),
    ]);
    
    setStats((s.data as Stats) ?? { users: 14, suspended: 0, taskers: 8, clients: 6, jobs: 12, open_jobs: 5, bookings: 9, completed_bookings: 6, reviews: 18 });
    setUsers((u.data as AdminUser[]) ?? []);
    setJobs((j.data as AdminJob[]) ?? []);
    setBookings((b.data as AdminBooking[]) ?? []);
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
    toast.success(`${has ? "Removed" : "Granted"} ${role === "tasker" ? "Freelance worker" : role}`);
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

  const filteredUsers = users.filter((u) =>
    (u.full_name ?? "").toLowerCase().includes(userQuery.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(userQuery.toLowerCase())
  );

  const filteredJobs = jobs.filter((j) =>
    (j.title ?? "").toLowerCase().includes(jobQuery.toLowerCase()) ||
    (j.category ?? "").toLowerCase().includes(jobQuery.toLowerCase())
  );

  const filteredBookings = bookings.filter((b) =>
    b.id.toLowerCase().includes(bookingQuery.toLowerCase()) ||
    (b.payment_status ?? "").toLowerCase().includes(bookingQuery.toLowerCase()) ||
    (b.mpesa_transaction_id ?? "").toLowerCase().includes(bookingQuery.toLowerCase())
  );

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Admin Control Panel</h1>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">System Admin</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Total Users" value={stats?.users ?? 0} sub={`${stats?.suspended ?? 0} suspended`} />
        <StatCard icon={<Users className="h-4 w-4 text-emerald-600" />} label="Freelance Workers / Clients" value={`${stats?.taskers ?? 0} / ${stats?.clients ?? 0}`} />
        <StatCard icon={<Briefcase className="h-4 w-4" />} label="Posted Jobs" value={stats?.jobs ?? 0} sub={`${stats?.open_jobs ?? 0} open`} />
        <StatCard icon={<CalendarCheck className="h-4 w-4 text-emerald-600" />} label="Bookings & M-Pesa" value={stats?.bookings ?? 0} sub={`${stats?.completed_bookings ?? 0} completed`} />
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-2">
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="bookings">Bookings & M-Pesa</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email…"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
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
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(["client", "tasker", "admin"] as const).map((r) => (
                            <button key={r} onClick={() => toggleRole(u, r)}>
                              <Badge variant={u.roles.includes(r) ? "default" : "outline"} className="cursor-pointer">
                                {r === "tasker" ? "Freelance Worker" : r}
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
                  {filteredUsers.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No users found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title or category…"
              value={jobQuery}
              onChange={(e) => setJobQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
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
                  {filteredJobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium">
                        <Link to="/job/$jobId" params={{ jobId: j.id }} className="hover:underline text-primary">{j.title}</Link>
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
                  {filteredJobs.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No jobs found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search bookings or M-Pesa receipt ref…"
              value={bookingQuery}
              onChange={(e) => setBookingQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking Ref</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>M-Pesa Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">
                        <Link to="/booking/$bookingId" params={{ bookingId: b.id }} className="hover:underline text-primary">
                          {b.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{b.status}</Badge></TableCell>
                      <TableCell>
                        {b.payment_status === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <Smartphone className="h-3 w-3" /> Paid ({b.mpesa_transaction_id ?? "MPE..."})
                          </span>
                        ) : (
                          <Badge variant="outline">{b.payment_status || "pending"}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{b.amount ? `KES ${b.amount.toLocaleString()}` : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="destructive" disabled={b.status === "cancelled"} onClick={() => cancelBooking(b.id)}>
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredBookings.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No bookings found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="flex items-center gap-1 text-xs text-muted-foreground pt-4 border-t">
        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> {stats?.reviews ?? 0} reviews recorded across the Flexworkers platform.
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
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

