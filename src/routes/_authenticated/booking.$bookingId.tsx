import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { ChatPanel } from "@/components/chat-panel";
import { StarRatingInput, StarRating } from "@/components/star-rating";
import { toast } from "sonner";
import { ArrowLeft, Wallet, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/booking/$bookingId")({
  head: () => ({ meta: [{ title: "Booking — Flexworkers" }] }),
  component: BookingDetail,
});

type Detail = {
  id: string;
  job_id: string;
  job_title: string;
  job_description: string;
  status: string;
  amount: number | null;
  payment_status: string | null;
  scheduled_date: string | null;
  client_id: string;
  client_name: string | null;
  tasker_id: string;
  tasker_name: string | null;
  my_role: "client" | "tasker";
  i_reviewed: boolean;
  other_reviewed: boolean;
};

function BookingDetail() {
  const { bookingId } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const [b, setB] = useState<Detail | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await (supabase.rpc as any)("get_booking_detail", { _booking_id: bookingId });
    const row = Array.isArray(data) ? data[0] : null;
    setB(row);
    if (row) {
      const { data: rv } = await supabase.from("reviews")
        .select("id,rating,comment,created_at,reviewer_id")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      setReviews((rv ?? []) as any[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  async function changeStatus(status: string) {
    const { error } = await (supabase.rpc as any)("update_booking_status", { _booking_id: bookingId, _status: status });
    if (error) return toast.error(error.message);
    toast.success(`Booking ${status}`);
    load();
  }

  async function submitReview() {
    setSubmitting(true);
    const { error } = await (supabase.rpc as any)("create_review", {
      _booking_id: bookingId, _rating: rating, _comment: comment || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Review submitted");
    setComment("");
    load();
  }

  if (loading) return <main className="container mx-auto px-4 py-10"><p className="text-muted-foreground">Loading…</p></main>;
  if (!b || !user) return <main className="container mx-auto px-4 py-10"><p>Booking not found.</p></main>;

  const isClient = b.my_role === "client";
  const other = isClient ? b.tasker_name : b.client_name;

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate({ to: "/bookings" })}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to bookings
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge>{b.status}</Badge>
            {b.payment_status && <Badge variant="outline">Payment: {b.payment_status}</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{b.job_title}</h1>
          <p className="text-sm text-muted-foreground">
            {isClient ? "Tasker" : "Client"}: {other ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {b.status === "pending" && !isClient && (
            <>
              <Button variant="outline" onClick={() => changeStatus("declined")}>Decline</Button>
              <Button onClick={() => changeStatus("accepted")}>Accept</Button>
            </>
          )}
          {b.status === "accepted" && !isClient && (
            <Button onClick={() => changeStatus("in_progress")}>Start work</Button>
          )}
          {(b.status === "accepted" || b.status === "in_progress") && (
            <Button onClick={() => changeStatus("completed")}>Mark completed</Button>
          )}
          {(b.status === "pending" || b.status === "accepted") && isClient && (
            <Button variant="outline" onClick={() => changeStatus("cancelled")}>Cancel</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader><CardTitle>Chat</CardTitle></CardHeader>
            <CardContent>
              <ChatPanel bookingId={b.id} currentUserId={user.id} />
            </CardContent>
          </Card>

          {b.status === "completed" && (
            <Card>
              <CardHeader><CardTitle>Reviews</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {reviews.length === 0 && !b.i_reviewed && (
                  <p className="text-sm text-muted-foreground">No reviews yet.</p>
                )}
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <StarRating value={r.rating} />
                      <span className="text-xs text-muted-foreground">
                        {r.reviewer_id === user.id ? "You" : (isClient ? b.tasker_name : b.client_name)}
                      </span>
                    </div>
                    {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
                {!b.i_reviewed && (
                  <div className="space-y-3 rounded-lg border border-dashed p-4">
                    <p className="text-sm font-medium">Leave a review</p>
                    <StarRatingInput value={rating} onChange={setRating} />
                    <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How did it go?" />
                    <div className="flex justify-end">
                      <Button onClick={submitReview} disabled={submitting}>{submitting ? "Sending…" : "Submit review"}</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-5 text-sm">
              {b.amount != null && <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> KES {b.amount}</div>}
              {b.scheduled_date && <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> {new Date(b.scheduled_date).toLocaleString()}</div>}
              <div className="pt-2">
                <Link to="/job/$jobId" params={{ jobId: b.job_id }} className="text-primary hover:underline">View job details →</Link>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Job brief</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{b.job_description}</p></CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
