import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAnonUserId } from "@/lib/anonUser";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Note = {
  id: string;
  note: string;
  user_id: string;
  created_at: string | null;
};

export const TenderNotes = ({ tenderId }: { tenderId: string }) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
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
      toast.error(error.message);
      return;
    }
    setText("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("tender_notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setNotes((n) => n.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
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

      <div className="space-y-2">
        {loading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="text-xs text-muted-foreground">No notes yet.</div>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-md border border-border bg-card p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap flex-1">{n.note}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  onClick={() => remove(n.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {formatDateTime(n.created_at)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
