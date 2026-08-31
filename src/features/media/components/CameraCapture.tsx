import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CircleStop, RefreshCcw, Video, X } from "lucide-react";
import { toast } from "sonner";

interface CameraCaptureProps {
  mode: "photo" | "video" | "both";
  maxDurationSeconds?: number;
  onCapture: (file: File, kind: "image" | "video", durationSeconds?: number) => void;
  onClose: () => void;
}

export function CameraCapture({ mode, maxDurationSeconds = 60, onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: mode !== "photo",
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        toast.error("Não foi possível acessar a câmera. Verifique as permissões.");
        onClose();
      }
    }
    start();
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (recording && elapsed >= maxDurationSeconds) stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, recording]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture(new File([blob], `foto-${Date.now()}.webp`, { type: "image/webp" }), "image");
    }, "image/webp", 0.9);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const type = rec.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "mp4" : "webm";
      onCapture(new File([blob], `video-${Date.now()}.${ext}`, { type }), "video", elapsed || 1);
    };
    recorderRef.current = rec;
    rec.start();
    setElapsed(0);
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-full w-full flex-1 object-cover"
        style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar câmera"
        className="absolute left-3 top-3 rounded-full bg-black/50 p-2 text-white"
      >
        <X className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
        aria-label="Trocar câmera"
        className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white"
      >
        <RefreshCcw className="h-5 w-5" />
      </button>
      {recording && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground">
          ● {elapsed}s / {maxDurationSeconds}s
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 pb-8">
        {(mode === "photo" || mode === "both") && !recording && (
          <Button size="lg" className="h-16 w-16 rounded-full" disabled={!ready} onClick={takePhoto} aria-label="Tirar foto">
            <Camera className="h-7 w-7" />
          </Button>
        )}
        {(mode === "video" || mode === "both") && (
          <Button
            size="lg"
            variant={recording ? "destructive" : "secondary"}
            className="h-16 w-16 rounded-full"
            disabled={!ready}
            onClick={recording ? stopRecording : startRecording}
            aria-label={recording ? "Parar gravação" : "Gravar vídeo"}
          >
            {recording ? <CircleStop className="h-7 w-7" /> : <Video className="h-7 w-7" />}
          </Button>
        )}
      </div>
    </div>
  );
}