import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAnonUserId } from "@/lib/anonUser";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { Trash2, Loader2 } from "lucide-react";
import { handleDbError } from "@/lib/dbError";
import { toast } from "sonner";
import { AvatarInitial } from "@/components/AvatarInitial";
import { cn } from "@/lib/utils";

type Note = {
  id: string;
  note: string;
  user_id: string;
  created_at: string | null;
};

type Profile = { id: string; full_name: string | null; role: string };

export const TenderNotes = ({ tenderId }: { tenderId: string }) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tender_notes")
      .select("id, note, user_id, created_at")
      .eq("tender_id", tenderId)
      .order("created_at", { ascending: false });
    setNotes((data as Note[]) ?? []);
    const ids = Array.from(new Set(((data as Note[]) ?? []).map((n) => n.user_id).filter(Boolean)));
    if (ids.length > 0) {
      const { data: pData } = await supabase
        .from("user_profiles")
        .select("id, full_name, role")
        .in("id", ids);
      const map: Record<string, Profile> = {};
      (pData as Profile[] | null | undefined)?.forEach((p) => {
        map[p.id] = p;
      });
      setProfiles(map);
    } else {
      setProfiles({});
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [tenderId]);

  const add = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("tender_notes").insert({
      tender_id: tenderId,
      user_id: user?.id ?? getAnonUserId(),
      note: text.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error(handleDbError(error));
      return;
    }
    setText("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("tender_notes").delete().eq("id", id);
    if (error) return toast.error(handleDbError(error));
    setNotes((n) => n.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-w-2xl">
        <Textarea
          placeholder="Add an internal note…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={add} disabled={submitting || !text.trim()}>
            {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Add note
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-w-3xl">
        {loading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="text-xs text-muted-foreground">No notes yet.</div>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-border bg-card p-3.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <AvatarInitial
                    label={
                      (n.user_id === user?.id ? user?.email : profiles[n.user_id]?.full_name) ??
                      profiles[n.user_id]?.role ??
                      "User"
                    }
                    seed={n.user_id}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-xs font-medium text-foreground truncate">
                        {n.user_id === user?.id
                          ? (user?.email ?? "You")
                          : (profiles[n.user_id]?.full_name ?? "Unknown user")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTime(n.created_at)}
                      </span>
                      {profiles[n.user_id]?.role && (
                        <span className="text-[10px] rounded-full border border-border bg-muted/40 px-2 py-0.5 text-muted-foreground">
                          {profiles[n.user_id]?.role}
                        </span>
                      )}
                    </div>
                    <p className={cn("whitespace-pre-wrap text-foreground/90 mt-2")}>{n.note}</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => remove(n.id)}
                  aria-label="Delete note"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
