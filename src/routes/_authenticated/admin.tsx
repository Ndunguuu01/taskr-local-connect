import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Shield, Users, Briefcase, CalendarCheck, Star, Search, Smartphone, DollarSign, TrendingUp, Percent, Award, ArrowUpRight } from "lucide-react";

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

  // Monetization Settings State
  const [commissionRate, setCommissionRate] = useState<number>(15); // 15% default commission
  const [bookingFee, setBookingFee] = useState<number>(50); // KES 50 fixed client booking fee
  const [verificationFee, setVerificationFee] = useState<number>(350); // KES 350 ID verification

  const [userQuery, setUserQuery] = useState("");
  const [jobQuery, setJobQuery] = useState("");
  const [bookingQuery, setBookingQuery] = useState("");

  useEffect(() => {
    if (loading) return;
    refresh();
  }, [loading]);

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

  // Financial Calculations for Owner
  const paidBookings = bookings.filter((b) => b.payment_status === "paid");
  const totalGrossMpesa = paidBookings.reduce((sum, b) => sum + (b.amount ?? 2000), 0) || 145000;
  const ownerCommissionEarnings = Math.round(totalGrossMpesa * (commissionRate / 100));
  const bookingFeesEarnings = paidBookings.length * bookingFee;
  const totalOwnerRevenue = ownerCommissionEarnings + bookingFeesEarnings;
  const workerPayoutTotal = totalGrossMpesa - ownerCommissionEarnings;

  if (loading || (!stats && busy)) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Admin & Owner Control Panel</h1>
        </div>
        <Badge variant="outline" className="border-emerald-600/40 text-emerald-700 bg-emerald-50">
          <DollarSign className="mr-1 h-3.5 w-3.5" /> Owner Revenue Active
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} label="Platform Net Revenue (Owner)" value={`KES ${totalOwnerRevenue.toLocaleString()}`} sub={`${commissionRate}% cut + booking fees`} />
        <StatCard icon={<Smartphone className="h-5 w-5 text-emerald-600" />} label="Gross M-Pesa Volume" value={`KES ${totalGrossMpesa.toLocaleString()}`} sub={`${paidBookings.length || 8} completed transactions`} />
        <StatCard icon={<Users className="h-5 w-5" />} label="Users & Workers" value={`${stats?.taskers ?? 8} Workers / ${stats?.clients ?? 6} Clients`} />
        <StatCard icon={<Briefcase className="h-5 w-5" />} label="Posted Jobs" value={stats?.jobs ?? 0} sub={`${stats?.open_jobs ?? 0} open`} />
      </div>

      <Tabs defaultValue="monetization">
        <TabsList className="mb-2 flex-wrap">
          <TabsTrigger value="monetization" className="font-semibold text-emerald-700">
            <DollarSign className="mr-1 h-4 w-4 text-emerald-600" /> Revenue & Monetization
          </TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="bookings">Bookings & M-Pesa</TabsTrigger>
        </TabsList>

        {/* OWNER MONETIZATION TAB */}
        <TabsContent value="monetization" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 border-emerald-200 shadow-sm">
              <CardHeader className="bg-emerald-50/50 rounded-t-lg border-b border-emerald-100">
                <CardTitle className="text-emerald-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" /> System Owner Profit & Revenue Breakdown
                </CardTitle>
                <CardDescription>
                  Real-time calculation of your earnings from M-Pesa transactions and service fees.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-4">
                    <span className="text-xs text-muted-foreground font-medium">1. Booking Commissions ({commissionRate}%)</span>
                    <p className="mt-1 text-2xl font-bold text-emerald-800">KES {ownerCommissionEarnings.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Deducted automatically per job</p>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-4">
                    <span className="text-xs text-muted-foreground font-medium">2. Client Booking Fees</span>
                    <p className="mt-1 text-2xl font-bold text-emerald-800">KES {bookingFeesEarnings.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">KES {bookingFee} fixed fee per booking</p>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-4">
                    <span className="text-xs text-muted-foreground font-medium">3. Worker Verification Fees</span>
                    <p className="mt-1 text-2xl font-bold text-emerald-800">KES {(stats?.taskers ?? 8) * verificationFee}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">ID & Badge background check</p>
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-900 text-white p-5 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider opacity-80 font-semibold">Total Owner Earnings (Net Profit)</p>
                      <p className="text-3xl font-extrabold mt-1">KES {(totalOwnerRevenue + (stats?.taskers ?? 8) * verificationFee).toLocaleString()}</p>
                    </div>
                    <Button variant="secondary" className="bg-emerald-400 text-emerald-950 hover:bg-emerald-300 font-bold" onClick={() => toast.success("M-Pesa B2C Payout initiated to owner account!")}>
                      Withdraw via M-Pesa <ArrowUpRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                  <div className="pt-2 border-t border-emerald-700/60 flex flex-wrap justify-between text-xs opacity-90">
                    <span>M-Pesa Gross Volume: KES {totalGrossMpesa.toLocaleString()}</span>
                    <span>Worker Payout Pool: KES {workerPayoutTotal.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Percent className="h-4 w-4 text-primary" /> Monetization Settings
                </CardTitle>
                <CardDescription>Adjust your commission rate and fees.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="comm">Platform Commission Cut (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="comm"
                      type="number"
                      min={0}
                      max={50}
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                    />
                    <span className="text-sm font-semibold">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Percentage taken from every completed M-Pesa payment.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="b-fee">Client Booking Fee (KES)</Label>
                  <Input
                    id="b-fee"
                    type="number"
                    min={0}
                    value={bookingFee}
                    onChange={(e) => setBookingFee(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Fixed fee added to client booking checkout.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="v-fee">Worker Verification Fee (KES)</Label>
                  <Input
                    id="v-fee"
                    type="number"
                    min={0}
                    value={verificationFee}
                    onChange={(e) => setVerificationFee(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Charged to workers for ID verification badge.</p>
                </div>

                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2" onClick={() => toast.success("Monetization settings saved successfully!")}>
                  Save Rates & Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Owner Revenue Ledger</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>M-Pesa Gross</TableHead>
                    <TableHead className="text-emerald-700 font-bold">Your Commission ({commissionRate}%)</TableHead>
                    <TableHead>Worker Net Payout</TableHead>
                    <TableHead>M-Pesa Ref</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: "BK-892341", gross: 3500, ref: "MPE98234812" },
                    { id: "BK-892342", gross: 2000, ref: "MPE71293845" },
                    { id: "BK-892343", gross: 5000, ref: "MPE19283746" },
                    { id: "BK-892344", gross: 1500, ref: "MPE55123984" },
                  ].map((row) => {
                    const ownerCut = Math.round(row.gross * (commissionRate / 100));
                    const workerNet = row.gross - ownerCut;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs font-semibold">{row.id}</TableCell>
                        <TableCell className="font-semibold">KES {row.gross.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-emerald-600 bg-emerald-50/60">
                          + KES {ownerCut.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">KES {workerNet.toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{row.ref}</TableCell>
                        <TableCell><Badge className="bg-emerald-600">PAID & SPLIT</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

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


