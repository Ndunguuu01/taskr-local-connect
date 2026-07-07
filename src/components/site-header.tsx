import { Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "@/components/notification-bell";

export function SiteHeader() {
  const { user, isTasker } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const dashboardPath = isTasker ? "/tasker" : "/client";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Briefcase className="h-4 w-4" />
          </span>
          <span className="text-lg">Flexworkers</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/taskers" className="text-muted-foreground hover:text-foreground">Find taskers</Link>
          <Link to="/" hash="how-it-works" className="text-muted-foreground hover:text-foreground">How it works</Link>
          <Link to="/" hash="categories" className="text-muted-foreground hover:text-foreground">Categories</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/bookings">Bookings</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to={dashboardPath}>Dashboard</Link>
              </Button>
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-1 h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
