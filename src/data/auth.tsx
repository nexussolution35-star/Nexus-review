/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseReady } from "../lib/supabase";

export interface AppUser {
  id: string;
  tenantId: string;
  role: "manager" | "staff";
  name: string | null;
  email: string | null;
}

interface AuthValue {
  ready: boolean; // is Supabase configured at all
  loading: boolean;
  session: Session | null;
  appUser: AppUser | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  signUpManager: (input: ManagerSignup) => Promise<{ error: string | null }>;
}

export interface ManagerSignup {
  restaurantName: string;
  managerName: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(supabaseReady);
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (!supabaseReady) return;
    let active = true;

    const loadAppUser = async (userId: string) => {
      const { data } = await supabase
        .from("app_users")
        .select("id, tenant_id, role, name, email")
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;
      setAppUser(
        data
          ? {
              id: data.id as string,
              tenantId: data.tenant_id as string,
              role: data.role as "manager" | "staff",
              name: (data.name as string) ?? null,
              email: (data.email as string) ?? null,
            }
          : null
      );
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) await loadAppUser(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      if (s?.user) await loadAppUser(s.user.id);
      else setAppUser(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabaseReady) return { error: "Sign in is not connected yet." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (supabaseReady) await supabase.auth.signOut();
    setSession(null);
    setAppUser(null);
  };

  const signUpManager = async (input: ManagerSignup) => {
    if (!supabaseReady) return { error: "Sign up is not connected yet." };
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Could not create the account. Try again." };
    // Server-side function creates the tenant and the manager's app_users row
    // atomically (security definer), then RLS applies from there on.
    const { error: rpcError } = await supabase.rpc("create_tenant_and_manager", {
      p_restaurant_name: input.restaurantName,
      p_manager_name: input.managerName,
    });
    return { error: rpcError?.message ?? null };
  };

  const value = useMemo<AuthValue>(
    () => ({
      ready: supabaseReady,
      loading,
      session,
      appUser,
      signIn,
      signOut,
      signUpManager,
    }),
    [loading, session, appUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
