import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAnonUserId } from "@/lib/anonUser";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { Trash2 } from "lucide-react";
import { handleDbError } from "@/lib/dbError";
import { toast } from "sonner";
import { AvatarInitial } from "@/components/AvatarInitial";

/* ---------------- Types ---------------- */

type Note = {
  id: string;
  note: string;
  user_id: string;
  created_at: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
};

/* ---------------- Spinner ---------------- */

const Spinner = () => (
  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
);

/* ---------------- Composer ---------------- */

const NoteComposer = ({
  text,
  setText,
  onAdd,
  submitting,
}: any) => {
  return (
    <div className="inline-flex flex-col gap-2 border rounded-xl bg-card p-3 w-fit max-w-[520px]">
      <Textarea
        placeholder="Add a note…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="resize-none border-0 bg-transparent w-[320px] focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={onAdd}
          disabled={submitting || !text.trim()}
          className="rounded-full px-3"
        >
          {submitting && <div role="status" aria-label="Loading...">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              {[...Array(8)].map((_, i) => (
                <line
                  key={i}
                  x1="12"
                  y1="3"
                  x2="12"
                  y2="6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="opacity-30"
                  transform={`rotate(${i * 45} 12 12)`}
                />
              ))}
            </svg>
          </div>}
          <span className="text-sm font-medium">Add</span>
        </Button>
      </div>
    </div>
  );
};

/* ---------------- Note Card ---------------- */

const NoteCard = ({
  note,
  user,
  profile,
  onDelete,
}: any) => {
  return (
    <div className="inline-flex gap-3 border rounded-xl bg-card p-3 w-fit max-w-[600px]">

      <AvatarInitial
        label={
          note.user_id === user?.id
            ? user?.email
            : profile?.full_name ?? "User"
        }
        seed={note.user_id}
        className="shrink-0"
      />

      <div className="min-w-0">

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium">
            {note.user_id === user?.id
              ? "You"
              : profile?.full_name ?? "Unknown"}
          </span>

          <span className="text-[10px] text-muted-foreground">
            {formatDateTime(note.created_at)}
          </span>

          {profile?.role && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
              {profile.role}
            </span>
          )}
        </div>

        <p className="mt-2 text-sm whitespace-pre-wrap text-foreground/80 break-words">
          {note.note}
        </p>

      </div>

      <button
        onClick={() => onDelete(note.id)}
        className="opacity-40 hover:opacity-100 transition self-start"
      >
        <Trash2 className="h-4 w-4" />
      </button>

    </div>
  );
};

/* ---------------- Skeleton ---------------- */

const Skeleton = () => (
  <div className="inline-flex gap-3 border rounded-xl bg-card/50 p-3 w-[420px] animate-pulse">
    <div className="h-8 w-8 rounded-full bg-muted" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-24 bg-muted rounded" />
      <div className="h-2 w-32 bg-muted rounded" />
      <div className="h-10 w-full bg-muted rounded" />
    </div>
  </div>
);

/* ---------------- Main ---------------- */

export const TenderNotes = ({ tenderId }: { tenderId: string }) => {
  const { user } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("tender_notes")
      .select("id, note, user_id, created_at")
      .eq("tender_id", tenderId)
      .order("created_at", { ascending: false });

    const notesData = (data as Note[]) ?? [];
    setNotes(notesData);

    const ids = [...new Set(notesData.map(n => n.user_id).filter(Boolean))];

    if (ids.length) {
      const { data: pData } = await supabase
        .from("user_profiles")
        .select("id, full_name, role")
        .in("id", ids);

      const map: Record<string, Profile> = {};
      pData?.forEach(p => (map[p.id] = p));
      setProfiles(map);
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
    const { error } = await supabase
      .from("tender_notes")
      .delete()
      .eq("id", id);

    if (error) return toast.error(handleDbError(error));

    setNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Composer */}
      <NoteComposer
        text={text}
        setText={setText}
        onAdd={add}
        submitting={submitting}
      />

      {/* Notes */}
      <div className="flex flex-col gap-2">
  {loading ? (
    <>
      <Skeleton />
      <Skeleton />
    </>
  ) : notes.length === 0 ? (
    <div className="text-sm text-muted-foreground">
      No notes yet
    </div>
  ) : (
    <div className="flex flex-wrap mt-4 gap-3">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          user={user}
          profile={profiles[note.user_id]}
          onDelete={remove}
        />
      ))}
    </div>
  )}
</div>
    </div>
  );
};