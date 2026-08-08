import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";

export function BookTaskerDialog({ taskerId, taskerName, defaultAmount }: { taskerId: string; taskerName?: string; defaultAmount?: number | null }) {
  const { user, isClient } = useSession();
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [jobId, setJobId] = useState("");
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("jobs")
      .select("id,title")
      .eq("client_id", user.id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .then(({ data }) => setJobs((data ?? []) as any));
  }, [open, user]);

  async function submit() {
    if (!jobId) return toast.error("Pick a job");
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("create_booking", {
      _job_id: jobId,
      _tasker_id: taskerId,
      _amount: amount ? Number(amount) : null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Booking sent");
    setOpen(false);
    navigate({ to: "/booking/$bookingId", params: { bookingId: data as string } });
  }

  if (!user) {
    return (
      <Button onClick={() => navigate({ to: "/auth", search: { mode: "signup", role: "client" } })}>
        Book this Freelance worker
      </Button>
    );
  }
  if (!isClient) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Book this Freelance worker</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book {taskerName ?? "Freelance worker"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select one of your open jobs</Label>
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You have no open jobs.{" "}
                <button className="text-primary underline" onClick={() => navigate({ to: "/post-job" })}>
                  Post a job first
                </button>
                .
              </p>
            ) : (
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger><SelectValue placeholder="Choose a job" /></SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="amt">Agreed amount (KES, optional)</Label>
            <Input id="amt" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={loading || !jobId}>{loading ? "Sending…" : "Send booking request"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
