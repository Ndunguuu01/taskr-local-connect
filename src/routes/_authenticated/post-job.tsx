import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationPicker, type PickedLocation } from "@/components/location-picker";
import { CompanyPaymentDialog } from "@/components/company-payment-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Zap, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/post-job")({
  head: () => ({ meta: [{ title: "Post a job — Flexworkers" }] }),
  component: PostJob,
});

const CATEGORIES = ["Cleaning", "Plumbing", "Electrical", "TV Mounting", "Painting", "Moving", "Handyman", "Other"];

function PostJob() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [urgentReceipt, setUrgentReceipt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!location) return toast.error("Please pin the job location on the map.");
    if (!category) return toast.error("Please pick a category.");
    setSaving(true);
    const { data, error } = await (supabase.rpc as any)("create_job", {
      _title: isUrgent ? `[URGENT ⚡] ${title}` : title,
      _description: description + (urgentReceipt ? `\n\n[Urgent Promotion Paid: ${urgentReceipt}]` : ""),
      _category: category,
      _budget: budget ? Number(budget) : null,
      _location_address: location.address,
      _lat: location.lat,
      _lng: location.lng,
      _scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isUrgent ? "Urgent job posted with top priority matching!" : "Job posted!");
    navigate({ to: "/job/$jobId", params: { jobId: data as string } });
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/client"><ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Post a new job</CardTitle>
          <CardDescription>Connect with verified nearby freelance workers.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mount 55-inch TV on drywall" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Agreed Worker Pay (KES)</Label>
                <Input id="budget" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Worker paid directly via M-Pesa" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Job Description</Label>
              <Textarea id="description" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the job, materials needed, and timeline..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">When needed (optional)</Label>
              <Input id="date" type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <LocationPicker value={location} onChange={setLocation} />
            </div>

            {/* OPTION 5: URGENT JOB PROMOTION (KES 100 to Company) */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <Zap className="h-5 w-5 text-amber-600 fill-amber-500" />
                    Promote as URGENT / PRIORITY Job (KES 100)
                  </div>
                  <p className="text-xs text-amber-800/90 leading-relaxed max-w-md">
                    Highlight your job at the top of category lists and send priority push notifications to available freelance workers for 10x faster responses.
                  </p>
                </div>
                {isUrgent ? (
                  <Badge className="bg-emerald-600 gap-1 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" /> URGENT PAID
                  </Badge>
                ) : (
                  <CompanyPaymentDialog
                    type="urgent_job"
                    amount={100}
                    title="Promote Job as URGENT (KES 100)"
                    description="Pay KES 100 via M-Pesa to place your job post at the top of worker feeds."
                    triggerLabel="Promote (KES 100)"
                    triggerVariant="secondary"
                    onSuccess={(ref) => {
                      setIsUrgent(true);
                      setUrgentReceipt(ref);
                    }}
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/client" })}>Cancel</Button>
              <Button type="submit" disabled={saving} className={isUrgent ? "bg-amber-600 hover:bg-amber-700 text-white font-bold" : ""}>
                {saving ? "Posting..." : isUrgent ? "Post URGENT Job ⚡" : "Post Job"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

