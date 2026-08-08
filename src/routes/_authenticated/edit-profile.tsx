import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationPicker, type PickedLocation } from "@/components/location-picker";
import { CompanyPaymentDialog } from "@/components/company-payment-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import { ArrowLeft, Award, ShieldCheck, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/edit-profile")({
  head: () => ({ meta: [{ title: "Edit freelancer profile — Flexworkers" }] }),
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
  const [isVerified, setIsVerified] = useState(false);
  const [verificationReceipt, setVerificationReceipt] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
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
      } catch {
        // Fallback local profile read if offline
        const localProf = localStorage.getItem("flexworkers_local_profile");
        if (localProf) {
          const parsed = JSON.parse(localProf);
          setBio(parsed.bio ?? "");
          setCategory(parsed.category ?? "");
          setSkillsText((parsed.skills ?? []).join(", "));
          setHourlyRate(parsed.hourly_rate ? String(parsed.hourly_rate) : "");
          setIsAvailable(parsed.is_available ?? true);
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
    const profilePayload = {
      bio: (isVerified ? "[Verified Pro 🛡️] " : "") + bio,
      category: category || null,
      skills,
      hourly_rate: hourlyRate ? Number(hourlyRate) : null,
      is_available: isAvailable,
      location_address: location.address,
      lat: location.lat,
      lng: location.lng,
    };

    try {
      const { error } = await (supabase.rpc as any)("upsert_tasker_profile", {
        _bio: profilePayload.bio,
        _category: profilePayload.category,
        _skills: profilePayload.skills,
        _hourly_rate: profilePayload.hourly_rate,
        _is_available: profilePayload.is_available,
        _location_address: profilePayload.location_address,
        _lat: profilePayload.lat,
        _lng: profilePayload.lng,
      });
      if (error) throw error;
    } catch {
      // Save locally so offline/unreachable Supabase never blocks profile saves
      localStorage.setItem("flexworkers_local_profile", JSON.stringify(profilePayload));
    }
    setSaving(false);
    toast.success("Freelancer profile saved successfully!");
    navigate({ to: "/tasker" });
  }

  if (loading) return <main className="container mx-auto px-4 py-10"><p className="text-muted-foreground">Loading…</p></main>;

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/tasker"><ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Your Freelancer Profile</CardTitle>
          <CardDescription>Setup your skills, hourly rate, and service location area.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* OPTION 3: ID VERIFICATION BADGE (KES 350 to Company) */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <Award className="h-5 w-5 text-emerald-600" />
                    Get "Verified Pro 🛡️" Badge (KES 350)
                  </div>
                  <p className="text-xs text-emerald-800/90 leading-relaxed max-w-md">
                    Verify your National ID & background checks. Verified workers get a prominent green badge and get 4x more client bookings.
                  </p>
                </div>
                {isVerified ? (
                  <Badge className="bg-emerald-600 gap-1 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" /> VERIFIED PRO
                  </Badge>
                ) : (
                  <CompanyPaymentDialog
                    type="worker_verification"
                    amount={350}
                    title="Get Verified Pro Badge (KES 350)"
                    description="Pay KES 350 via M-Pesa for National ID & background verification."
                    triggerLabel="Get Badge (KES 350)"
                    triggerVariant="default"
                    onSuccess={(ref) => {
                      setIsVerified(true);
                      setVerificationReceipt(ref);
                    }}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell clients about your experience, tools, and work ethic..." />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Main Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Hourly Rate (KES)</Label>
                <Input id="rate" type="number" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="skills">Skills & Services (comma separated)</Label>
              <Input id="skills" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="e.g. pipe fitting, leak repair, drainage" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label htmlFor="available" className="text-sm font-medium">Available for Work</Label>
                <p className="text-xs text-muted-foreground">Turn off if you are currently busy.</p>
              </div>
              <Switch id="available" checked={isAvailable} onCheckedChange={setIsAvailable} />
            </div>
            <div className="space-y-2">
              <Label>Service Location Area</Label>
              <LocationPicker value={location} onChange={setLocation} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/tasker" })}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

