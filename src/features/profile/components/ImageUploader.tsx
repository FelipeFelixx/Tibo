import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Upload, Trash2 } from "lucide-react";
import {
  ACCEPTED_TYPES,
  AVATAR_RESIZE,
  COVER_RESIZE,
  resizeImage,
  validateImageFile,
} from "../image-utils";
import { removeProfileImage, uploadProfileImage, type BucketName } from "../api";

interface ImageUploaderProps {
  bucket: BucketName;
  userId: string;
  currentPath: string | null;
  onChange: (path: string | null) => void;
  label: string;
}

export function ImageUploader({ bucket, userId, currentPath, onChange, label }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const err = validateImageFile(file);
    if (err) return toast.error(err);
    setUploading(true);
    setProgress(5);
    try {
      const resized = await resizeImage(file, bucket === "avatars" ? AVATAR_RESIZE : COVER_RESIZE);
      setProgress(30);
      const path = await uploadProfileImage(bucket, userId, resized, (p) =>
        setProgress(30 + (p * 0.7)),
      );
      if (currentPath) {
        removeProfileImage(bucket, currentPath).catch(() => undefined);
      }
      onChange(path);
      toast.success(`${label} atualizado`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Falha no upload";
      toast.error(msg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleRemove() {
    if (!currentPath) return;
    try {
      await removeProfileImage(bucket, currentPath);
      onChange(null);
      toast.success(`${label} removido`);
    } catch {
      toast.error("Falha ao remover");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {currentPath ? "Trocar" : "Enviar"} {label.toLowerCase()}
        </Button>
        {currentPath && (
          <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={handleRemove}>
            <Trash2 className="mr-2 h-4 w-4" /> Remover
          </Button>
        )}
      </div>
      {uploading && <Progress value={progress} className="h-1.5" />}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={handleSelect}
      />
      <p className="text-xs text-muted-foreground">JPG, PNG ou WebP · máx. 5MB</p>
    </div>
  );
}