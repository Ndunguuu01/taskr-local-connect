import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { LocalStore } from "@/lib/local-store";
import { toast } from "sonner";
import { Briefcase, Zap } from "lucide-react";

export function BookTaskerDialog({ taskerId, taskerName, defaultAmount }: { taskerId: string; taskerName?: string; defaultAmount?: number | null }) {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "direct">("existing");
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [directJobTitle, setDirectJobTitle] = useState("");
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    (async () => {
      let remoteJobs: { id: string; title: string }[] = [];
      try {
        const { data } = await supabase
          .from("jobs")
          .select("id,title")
          .order("created_at", { ascending: false });
        if (data) remoteJobs = data as any;
      } catch {}

      const localJobs = LocalStore.getJobs()
        .filter((j) => j.status === "open")
        .map((j) => ({ id: j.id, title: j.title }));

      const map = new Map<string, { id: string; title: string }>();
      [...localJobs, ...remoteJobs].forEach((j) => map.set(j.id, j));
      const combined = Array.from(map.values());

      setJobs(combined);
      if (combined.length > 0) {
        setSelectedJobId(combined[0].id);
        setMode("existing");
      } else {
        setMode("direct");
      }
    })();
  }, [open]);

  async function submit() {
    let activeJobId = selectedJobId;
    if (mode === "direct") {
      if (!directJobTitle.trim()) {
        toast.error("Please enter a short service title (e.g. Plumbing Service)");
        return;
      }
      // Create quick direct job
      const created = LocalStore.addJob({
        client_id: user?.id ?? "guest",
        client_name: user?.email ? user.email.split("@")[0] : "Client",
        title: `Direct Booking: ${directJobTitle.trim()}`,
        description: `Direct booking request for ${taskerName ?? "freelance worker"}.`,
        category: "General",
        budget: amount ? Number(amount) : null,
        location_address: "Nairobi",
        lat: -1.286389,
        lng: 36.817223,
        scheduled_date: null,
      });
      activeJobId = created.id;
    }

    if (!activeJobId) {
      toast.error("Please select a job or type a quick service title.");
      return;
    }

    setLoading(true);
    let targetBookingId = "";

    try {
      const { data, error } = await (supabase.rpc as any)("create_booking", {
        _job_id: activeJobId,
        _tasker_id: taskerId,
        _amount: amount ? Number(amount) : null,
      });
      if (error) throw error;
      targetBookingId = data as string;
    } catch {
      // Local fallback
      const localBooking = LocalStore.addBooking({
        job_id: activeJobId,
        client_id: user?.id ?? "guest",
        tasker_id: taskerId,
        amount: amount ? Number(amount) : null,
        scheduled_date: null,
      });
      targetBookingId = localBooking.id;
    }

    setLoading(false);
    toast.success(`Booking request sent to ${taskerName ?? "freelance worker"}!`);
    setOpen(false);
    navigate({ to: "/booking/$bookingId", params: { bookingId: targetBookingId } });
  }

  if (!user) {
    return (
      <Button onClick={() => navigate({ to: "/auth", search: { mode: "signup", role: "client" } })}>
        Book this Freelance worker
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-semibold shadow-sm cursor-pointer">Book this Freelance worker</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Book {taskerName ?? "Freelance worker"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing" className="gap-1 text-xs">
                <Briefcase className="h-3.5 w-3.5" /> From Posted Jobs ({jobs.length})
              </TabsTrigger>
              <TabsTrigger value="direct" className="gap-1 text-xs">
                <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Direct Booking
              </TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-3 pt-3">
              {jobs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground space-y-2">
                  <p>No open job posts found.</p>
                  <Button size="sm" variant="outline" onClick={() => setMode("direct")}>
                    Switch to Direct Booking
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select Your Open Job</Label>
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger><SelectValue placeholder="Choose a job" /></SelectTrigger>
                    <SelectContent>
                      {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            <TabsContent value="direct" className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label htmlFor="direct-title">Quick Job/Service Title</Label>
                <Input
                  id="direct-title"
                  placeholder="e.g. Home Plumbing Repair or House Cleaning"
                  value={directJobTitle}
                  onChange={(e) => setDirectJobTitle(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Quickly book this worker directly for a specific service.</p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="amt">Agreed Pay Amount (KES)</Label>
            <Input
              id="amt"
              type="number"
              min="0"
              placeholder="e.g. 1500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              {loading ? "Sending..." : "Send Booking Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

