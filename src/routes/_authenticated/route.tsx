import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { LocalStore } from "@/lib/local-store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) return { user: data.user };
    } catch {}

    const localSession = LocalStore.getSession();
    if (localSession?.user) {
      return { user: localSession.user };
    }
    throw redirect({ to: "/auth" });
  },
  component: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Outlet />
    </div>
  ),
});

