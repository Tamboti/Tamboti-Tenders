import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tender, WORKFLOW_STATUSES } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const EditTenderDialog = ({
  tender,
  open,
  onOpenChange,
  onSaved,
}: {
  tender: Tender | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Tender>>(tender ?? {});

  useEffect(() => {
    setForm(tender ?? {});
  }, [tender]);

  if (!tender) return null;

  const update = (k: keyof Tender, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = {
      title: form.title,
      procuring_entity: form.procuring_entity,
      country: form.country,
      category: form.category,
      procurement_type: form.procurement_type,
      deadline: form.deadline || null,
      workflow_status: form.workflow_status,
      estimated_value_usd: form.estimated_value_usd,
      original_currency: form.original_currency,
      description: form.description,
      summary_en: form.summary_en,
      reference_number: form.reference_number,
      source_url: form.source_url,
    };
    const { error } = await supabase.from("tenders").update(payload).eq("id", tender.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tender updated");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit tender</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-1">
            <Label>Title</Label>
            <Input value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Procuring entity</Label>
            <Input
              value={form.procuring_entity ?? ""}
              onChange={(e) => update("procuring_entity", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Reference #</Label>
            <Input
              value={form.reference_number ?? ""}
              onChange={(e) => update("reference_number", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Country</Label>
            <Input value={form.country ?? ""} onChange={(e) => update("country", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Input
              value={form.category ?? ""}
              onChange={(e) => update("category", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Procurement type</Label>
            <Input
              value={form.procurement_type ?? ""}
              onChange={(e) => update("procurement_type", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Deadline</Label>
            <Input
              type="datetime-local"
              value={form.deadline ? form.deadline.slice(0, 16) : ""}
              onChange={(e) => update("deadline", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Estimated value (USD)</Label>
            <Input
              type="number"
              value={form.estimated_value_usd ?? ""}
              onChange={(e) =>
                update("estimated_value_usd", e.target.value ? Number(e.target.value) : null)
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Original currency</Label>
            <Input
              value={form.original_currency ?? ""}
              onChange={(e) => update("original_currency", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Workflow status</Label>
            <Select
              value={form.workflow_status ?? "New"}
              onValueChange={(v) => update("workflow_status", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKFLOW_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Source URL</Label>
            <Input
              value={form.source_url ?? ""}
              onChange={(e) => update("source_url", e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Summary (EN)</Label>
            <Textarea
              rows={3}
              value={form.summary_en ?? ""}
              onChange={(e) => update("summary_en", e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={form.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
