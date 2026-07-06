import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationPicker, type PickedLocation } from "@/components/location-picker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

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
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!location) return toast.error("Please pin the job location on the map.");
    if (!category) return toast.error("Please pick a category.");
    setSaving(true);
    const { data, error } = await (supabase.rpc as any)("create_job", {
      _title: title,
      _description: description,
      _category: category,
      _budget: budget ? Number(budget) : null,
      _location_address: location.address,
      _lat: location.lat,
      _lng: location.lng,
      _scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Job posted!");
    navigate({ to: "/job/$jobId", params: { jobId: data as string } });
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/client"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
      </Button>
      <Card>
        <CardHeader><CardTitle>Post a new job</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
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
                <Label htmlFor="budget">Budget (KES)</Label>
                <Input id="budget" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" required rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the job, what's needed, any tools or materials..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">When (optional)</Label>
              <Input id="date" type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <LocationPicker value={location} onChange={setLocation} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/client" })}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Posting..." : "Post job"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
