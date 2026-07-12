import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ChatImageUploadProps {
  userId: string;
  onImageUploaded: (url: string) => void;
  disabled?: boolean;
}

const ChatImageUpload = ({ userId, onImageUploaded, disabled }: ChatImageUploadProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-images").upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
      onImageUploaded(urlData.publicUrl);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled || uploading}
        onClick={() => fileRef.current?.click()}
        className="shrink-0"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
      </Button>
    </>
  );
};

export default ChatImageUpload;
