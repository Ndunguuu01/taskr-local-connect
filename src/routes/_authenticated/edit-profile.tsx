import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationPicker, type PickedLocation } from "@/components/location-picker";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/edit-profile")({
  head: () => ({ meta: [{ title: "Edit tasker profile — Flexworkers" }] }),
  component: EditProfile,
});

const CATEGORIES = ["Cleaning", "Plumbing", "Electrical", "TV Mounting", "Painting", "Moving", "Handyman", "Other"];

function EditProfile() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase.rpc as any)("get_tasker_public", { _user_id: user.id });
      const row = Array.isArray(data) ? data[0] : null;
      if (row) {
        setBio(row.bio ?? "");
        setCategory(row.category ?? "");
        setSkillsText((row.skills ?? []).join(", "));
        setHourlyRate(row.hourly_rate ? String(row.hourly_rate) : "");
        setIsAvailable(row.is_available ?? true);
        if (row.lat != null && row.lng != null) {
          setLocation({ lat: row.lat, lng: row.lng, address: row.location_address ?? "" });
        }
      }
      setLoading(false);
    })();
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!location) return toast.error("Please pin your service area on the map.");
    setSaving(true);
    const skills = skillsText.split(",").map((s) => s.trim()).filter(Boolean);
    const { error } = await (supabase.rpc as any)("upsert_tasker_profile", {
      _bio: bio,
      _category: category || null,
      _skills: skills,
      _hourly_rate: hourlyRate ? Number(hourlyRate) : null,
      _is_available: isAvailable,
      _location_address: location.address,
      _lat: location.lat,
      _lng: location.lng,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    navigate({ to: "/tasker" });
  }

  if (loading) return <main className="container mx-auto px-4 py-10"><p className="text-muted-foreground">Loading…</p></main>;

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/tasker"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
      </Button>
      <Card>
        <CardHeader><CardTitle>Your tasker profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell clients about your experience..." />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Main category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Hourly rate (KES)</Label>
                <Input id="rate" type="number" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="skills">Skills (comma separated)</Label>
              <Input id="skills" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="e.g. pipe fitting, leak repair, drainage" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label htmlFor="available" className="text-sm font-medium">Available for jobs</Label>
                <p className="text-xs text-muted-foreground">Turn off if you're not taking new work.</p>
              </div>
              <Switch id="available" checked={isAvailable} onCheckedChange={setIsAvailable} />
            </div>
            <div className="space-y-2">
              <Label>Service area</Label>
              <LocationPicker value={location} onChange={setLocation} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/tasker" })}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
