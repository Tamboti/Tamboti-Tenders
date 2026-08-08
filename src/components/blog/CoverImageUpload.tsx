import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "@/components/icons";

export const CoverImageUpload = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      toast.error("Upload failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <img
          src={value}
          alt="Cover"
          draggable={false}
          className="h-40 w-full select-none rounded-lg border border-border object-cover"
          style={{ WebkitTouchCallout: "none" }}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
        {value ? "Replace cover image" : "Upload cover image"}
      </Button>
    </div>
  );
};
