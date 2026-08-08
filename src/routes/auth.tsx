import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Briefcase, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { LocalStore } from "@/lib/local-store";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  role: z.enum(["client", "tasker"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [role, setRole] = useState<"client" | "tasker">(search.role ?? "client");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/", replace: true });
      } else {
        const local = LocalStore.getSession();
        if (local) navigate({ to: "/", replace: true });
      }
    }).catch(() => {
      const local = LocalStore.getSession();
      if (local) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();

    if (!email || !password) {
      toast.error("Email and password required");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: { full_name: fullName, phone, role },
            },
          });
          if (signUpError) throw signUpError;

          if (signUpData.session) {
            toast.success("Account created! Welcome to Flexworkers.");
            navigate({ to: role === "tasker" ? "/tasker" : "/client", replace: true });
            return;
          }

          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) {
            if (signInError.message.toLowerCase().includes("email not confirmed")) {
              toast.info("Account created! Please check your email to confirm, then log in.");
            } else {
              toast.success("Account created! Please log in with your credentials.");
            }
            setMode("signin");
            return;
          }

          if (signInData.session) {
            toast.success("Account created! Welcome to Flexworkers.");
            const userRole = signInData.user?.user_metadata?.role ?? role;
            navigate({ to: userRole === "tasker" ? "/tasker" : "/client", replace: true });
            return;
          }
        } catch (err: any) {
          // If Supabase host DNS fails or offline network error occurs, fallback to local storage session
          if (err instanceof Error && (err.message.includes("Failed to fetch") || err.message.includes("fetch") || err.name === "TypeError")) {
            const user = LocalStore.registerUser({
              email,
              password,
              full_name: fullName || email.split("@")[0],
              phone,
              role,
            });
            LocalStore.createSession(user);
            toast.success("Account created! Welcome to Flexworkers.");
            navigate({ to: role === "tasker" ? "/tasker" : "/client", replace: true });
            return;
          }
          throw err;
        }
      } else {
        try {
          const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            if (error.message.toLowerCase().includes("email not confirmed")) {
              throw new Error("Email not confirmed. Please check your inbox and click the confirmation link, then try again.");
            }
            if (error.message.toLowerCase().includes("invalid login credentials")) {
              throw new Error("Invalid email or password. Please check your credentials and try again.");
            }
            throw error;
          }
          toast.success("Welcome back!");
          const userRole = signInData.user?.user_metadata?.role;
          if (userRole === "tasker") {
            navigate({ to: "/tasker", replace: true });
          } else if (userRole === "client") {
            navigate({ to: "/client", replace: true });
          } else {
            navigate({ to: "/", replace: true });
          }
          return;
        } catch (err: any) {
          if (err instanceof Error && (err.message.includes("Failed to fetch") || err.message.includes("fetch") || err.name === "TypeError")) {
            const users = LocalStore.getUsers();
            const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
            if (found) {
              if (found.password && found.password !== password) {
                toast.error("Invalid password. Please check your credentials.");
                return;
              }
              LocalStore.createSession(found);
              toast.success("Welcome back!");
              navigate({ to: found.role === "tasker" ? "/tasker" : "/client", replace: true });
              return;
            } else {
              // Register new user on demand
              const user = LocalStore.registerUser({
                email,
                password,
                full_name: email.split("@")[0],
                phone: "",
                role,
              });
              LocalStore.createSession(user);
              toast.success("Welcome to Flexworkers!");
              navigate({ to: role === "tasker" ? "/tasker" : "/client", replace: true });
              return;
            }
          }
          throw err;
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen gradient-soft">
      <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Briefcase className="h-4 w-4" />
            </span>
            <span className="text-xl">Flexworkers</span>
          </Link>

          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle>{mode === "signup" ? "Create your account" : "Welcome back"}</CardTitle>
              <CardDescription>
                {mode === "signup" ? "Join Flexworkers as a client or Freelance worker." : "Log in to continue."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="space-y-2">
                      <Label>I want to</Label>
                      <RadioGroup
                        value={role}
                        onValueChange={(v) => setRole(v as "client" | "tasker")}
                        className="grid grid-cols-2 gap-3"
                      >
                        <Label htmlFor="r-client" className="flex cursor-pointer flex-col rounded-lg border border-input p-3 hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-accent">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem id="r-client" value="client" />
                            <span className="font-medium">Hire help</span>
                          </div>
                          <span className="mt-1 pl-6 text-xs text-muted-foreground">Post jobs & hire</span>
                        </Label>
                        <Label htmlFor="r-tasker" className="flex cursor-pointer flex-col rounded-lg border border-input p-3 hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-accent">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem id="r-tasker" value="tasker" />
                            <span className="font-medium">Work as Freelancer</span>
                          </div>
                          <span className="mt-1 pl-6 text-xs text-muted-foreground">Offer your skills</span>
                        </Label>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full name</Label>
                      <Input id="fullName" name="fullName" required maxLength={100} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone (M-Pesa)</Label>
                      <Input id="phone" name="phone" type="tel" placeholder="+254 7XX XXX XXX" maxLength={20} />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required maxLength={255} autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signup" ? "Create account" : "Log in"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button variant="outline" type="button" className="w-full" onClick={handleGoogle} disabled={loading}>
                Continue with Google
              </Button>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signup" ? "Already have an account? " : "New here? "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                >
                  {mode === "signup" ? "Log in" : "Create an account"}
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
