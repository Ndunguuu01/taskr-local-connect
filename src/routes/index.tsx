import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, MapPin, ShieldCheck, Sparkles, Wrench, Plug, Home as HomeIcon, Tv, Truck, PaintBucket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { useSession } from "@/hooks/use-session";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const categories = [
  { icon: Sparkles, label: "Cleaning" },
  { icon: Wrench, label: "Plumbing" },
  { icon: Plug, label: "Electrical" },
  { icon: Tv, label: "TV Mounting" },
  { icon: PaintBucket, label: "Painting" },
  { icon: Truck, label: "Moving" },
  { icon: HomeIcon, label: "Handyman" },
];

function LandingPage() {
  const navigate = useNavigate();
  const { user } = useSession();

  function handlePostJob() {
    if (user) {
      navigate({ to: "/post-job" });
    } else {
      navigate({ to: "/auth", search: { mode: "signup", role: "client" } });
    }
  }

  function handleBecomeTasker() {
    if (user) {
      navigate({ to: "/edit-profile" });
    } else {
      navigate({ to: "/auth", search: { mode: "signup", role: "tasker" } });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden gradient-soft">
        <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center z-10">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Vetted local help near you
            </span>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Hire local help,<br />
              <span className="text-primary">get it done today.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base sm:text-lg text-muted-foreground">
              Flexworkers connects you with vetted cleaners, plumbers, electricians and handy people nearby. Post a job, pick a freelance worker, pay by M-Pesa.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto text-base font-semibold shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={handlePostJob}
              >
                Post a job
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base font-semibold border-primary/30 hover:bg-accent cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleBecomeTasker}
              >
                Become a Freelance worker
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Verified profiles</span>
              <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> 5-star reviews</span>
            </div>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-primary/10 blur-3xl" />
            <img
              src={heroImg}
              alt="A freelance worker and client shaking hands after a completed job"
              width={1600}
              height={1200}
              className="relative aspect-[4/3] w-full rounded-2xl object-cover shadow-elevated"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="container mx-auto px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl">How Flexworkers works</h2>
          <p className="mt-3 text-muted-foreground">Three simple steps from idea to done.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { n: "01", title: "Post your task", body: "Describe what you need, set a budget, and drop a pin on the map." },
            { n: "02", title: "Match nearby", body: "Browse rated freelance workers close to you. Chat, then book the best fit." },
            { n: "03", title: "Pay when done", body: "Pay securely via M-Pesa after the job. Leave a review to help others." },
          ].map((s) => (
            <Card key={s.n} className="p-8 shadow-card hover:shadow-elevated transition-shadow">
              <div className="text-sm font-semibold text-primary">{s.n}</div>
              <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="gradient-soft">
        <div className="container mx-auto px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Popular services</h2>
            <p className="mt-3 text-muted-foreground">From a leaky tap to a spotless flat, we've got someone nearby.</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {categories.map(({ icon: Icon, label }) => (
              <Card key={label} className="flex flex-col items-center gap-3 p-6 transition-transform hover:-translate-y-1 hover:shadow-elevated cursor-pointer" onClick={() => navigate({ to: "/taskers" })}>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-medium">{label}</span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 sm:py-20">
        <Card className="gradient-hero flex flex-col items-center gap-6 p-8 sm:p-12 text-center text-primary-foreground shadow-elevated">
          <Search className="h-10 w-10" />
          <h2 className="text-3xl font-bold md:text-4xl">Ready to get started?</h2>
          <p className="max-w-xl opacity-90 text-base sm:text-lg">Sign up in seconds. Post your first job free.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 w-full sm:w-auto">
            <Button
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto text-base font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={handlePostJob}
            >
              Post a job
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-base font-semibold border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={handleBecomeTasker}
            >
              Earn as a Freelance worker
            </Button>
          </div>
        </Card>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} Flexworkers</span>
          <span>Built for local work, everywhere.</span>
        </div>
      </footer>
    </div>
  );
}

