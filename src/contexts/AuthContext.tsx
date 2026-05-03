import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "admin" | "viewer" | null;

type AuthCtx = {
  session: Session | null;
  user: User | null;
  role: Role;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => fetchRole(s.user), 0);
      } else {
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchRole(s.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (currentUser: User) => {
    const metadataRole = currentUser.app_metadata?.role ?? currentUser.user_metadata?.role;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.warn("Role lookup failed:", error.message);
      if (metadataRole === "admin" || metadataRole === "viewer") {
        setRole(metadataRole);
        return;
      }
      setRole("viewer");
      return;
    }

    if (data?.role === "admin" || data?.role === "viewer") {
      setRole(data.role);
      return;
    }

    if (metadataRole === "admin" || metadataRole === "viewer") {
      setRole(metadataRole);
      return;
    }

    setRole("viewer");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
