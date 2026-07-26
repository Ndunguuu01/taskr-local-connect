import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { LocalStore, type LocalSession } from "@/lib/local-store";

export type AppRole = "client" | "tasker" | "admin";

export function useSession() {
  const [session, setSession] = useState<Session | LocalSession | null>(null);
  const [user, setUser] = useState<User | LocalSession["user"] | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkLocalSession = () => {
      const local = LocalStore.getSession();
      if (local && mounted) {
        setSession(local);
        setUser(local.user);
        const r = local.user.user_metadata?.role;
        setRoles(r ? [r as AppRole] : ["client"]);
        setLoading(false);
        return true;
      }
      return false;
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      if (s) {
        setSession(s);
        setUser(s.user);
        setTimeout(async () => {
          try {
            const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id);
            if (mounted && data?.length) {
              setRoles(data.map((r) => r.role as AppRole));
            } else if (mounted) {
              const r = (s.user.user_metadata as any)?.role;
              setRoles(r ? [r as AppRole] : ["client"]);
            }
          } catch {
            if (mounted) {
              const r = (s.user.user_metadata as any)?.role;
              setRoles(r ? [r as AppRole] : ["client"]);
            }
          }
        }, 0);
      } else {
        checkLocalSession() || (setSession(null), setUser(null), setRoles([]));
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        try {
          const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", data.session.user.id);
          if (mounted && r?.length) setRoles(r.map((row) => row.role as AppRole));
          else if (mounted) {
            const role = (data.session.user.user_metadata as any)?.role;
            setRoles(role ? [role as AppRole] : ["client"]);
          }
        } catch {
          if (mounted) {
            const role = (data.session.user.user_metadata as any)?.role;
            setRoles(role ? [role as AppRole] : ["client"]);
          }
        }
        setLoading(false);
      } else {
        if (!checkLocalSession()) {
          setLoading(false);
        }
      }
    }).catch(() => {
      if (!mounted) return;
      if (!checkLocalSession()) {
        setLoading(false);
      }
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return {
    session,
    user,
    roles,
    loading,
    isAdmin: roles.includes("admin"),
    isTasker: roles.includes("tasker"),
    isClient: roles.includes("client") || roles.length === 0,
  };
}

