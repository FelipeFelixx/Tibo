import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CameraCapture } from "@/features/media/components/CameraCapture";
import { MediaEditor } from "@/features/media/components/MediaEditor";
import { createStory, MAX_STORY_VIDEO_SECONDS } from "../api";
import { storyKeys } from "../queries";

export function StoryComposer({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const [draft, setDraft] = useState<{ file: File; kind: "image" | "video"; duration?: number } | null>(null);
  const [caption, setCaption] = useState("");
  const [music, setMusic] = useState("");

  const publish = useMutation({
    mutationFn: (file: File) =>
      createStory({
        file,
        kind: draft!.kind,
        durationSeconds: draft?.duration,
        caption,
        musicTitle: music,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storyKeys.all });
      toast.success("Story publicado!");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function pickFile(f: File | undefined) {
    if (!f) return;
    const kind = f.type.startsWith("video") ? "video" : "image";
    if (f.size > 30 * 1024 * 1024) return toast.error("Arquivo maior que 30MB.");
    setDraft({ file: f, kind });
  }

  if (camera) {
    return (
      <CameraCapture
        mode="both"
        maxDurationSeconds={MAX_STORY_VIDEO_SECONDS}
        onCapture={(file, kind, durationSeconds) => {
          setDraft({ file, kind, duration: durationSeconds });
          setCamera(false);
        }}
        onClose={() => setCamera(false)}
      />
    );
  }

  if (draft) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex-1 overflow-y-auto">
          <MediaEditor
            file={draft.file}
            kind={draft.kind}
            submitLabel="Publicar story"
            busy={publish.isPending}
            onCancel={() => setDraft(null)}
            onDone={(file) => publish.mutate(file)}
          />
        </div>
        <div className="space-y-2 border-t border-border p-3">
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Legenda (opcional)" maxLength={200} />
          <Input value={music} onChange={(e) => setMusic(e.target.value)} placeholder="Música (opcional)" maxLength={80} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg animate-scale-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Novo story</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Foto ou vídeo de até {MAX_STORY_VIDEO_SECONDS}s. Expira em 24 horas.</p>
        <div className="mt-4 grid gap-2">
          <Button onClick={() => setCamera(true)} className="w-full"><Camera className="mr-2 h-4 w-4" />Usar câmera</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full">
            <ImagePlus className="mr-2 h-4 w-4" />Escolher da galeria
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}