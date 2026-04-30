import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tender } from "@/lib/types";
import { TenderDetail } from "@/components/tender/TenderDetail";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const TenderDetailPage = () => {
  const { id } = useParams();
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("tenders").select("*").eq("id", id).maybeSingle();
    setTender(data as Tender | null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to tenders
        </Link>
      </Button>
      {loading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : !tender ? (
        <div className="text-muted-foreground text-sm">Tender not found.</div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm p-6">
          <TenderDetail tender={tender} onChanged={load} />
        </div>
      )}
    </div>
  );
};

export default TenderDetailPage;
