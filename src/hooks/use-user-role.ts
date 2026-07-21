import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "admin" | "member";

/**
 * Reads the current user's role from user_profiles, cached via react-query
 * so it's fetched once per session (not on every render/route change).
 *
 * profiles_select RLS is `id = auth.uid()` — this can only ever read the
 * caller's own row, never anyone else's.
 */
export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async (): Promise<UserRole> => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      // Fail closed: an unrecognized/missing role is never treated as admin.
      return data?.role === "admin" ? "admin" : "member";
    },
    enabled: !!user?.id,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const role: UserRole | null = user ? query.data ?? null : null;

  return {
    role,
    isAdmin: role === "admin",
    isLoading: authLoading || (!!user && query.isLoading),
  };
};
