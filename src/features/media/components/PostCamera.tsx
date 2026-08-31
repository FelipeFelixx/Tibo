import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PostCameraProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

type FacingMode = "user" | "environment";

export function PostCamera({ onCapture, onClose }: PostCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async (mode: FacingMode) => {
    setStarting(true);
    setError(null);

    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Seu navegador não oferece acesso à câmera.");
      setStarting(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("[PostCamera] erro ao abrir câmera:", err);

      const name = err instanceof DOMException ? err.name : "";

      if (name === "NotAllowedError") {
        setError(
          "Permissão da câmera negada. Autorize a câmera nas configurações do navegador."
        );
      } else if (name === "NotFoundError") {
        setError("Nenhuma câmera foi encontrada neste aparelho.");
      } else if (name === "NotReadableError") {
        setError("A câmera está sendo usada por outro aplicativo.");
      } else {
        setError("Não foi possível abrir a câmera.");
      }
    } finally {
      setStarting(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    void startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [facingMode, startCamera, stopCamera]);

  function switchCamera() {
    setFacingMode((current) =>
      current === "environment" ? "user" : "environment"
    );
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video || video.readyState < 2) {
      setError("A câmera ainda não está pronta.");
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setError("Não foi possível obter a imagem da câmera.");
      return;
    }

    const canvas = document.createElement("canvas");

    const maxWidth = 1600;
    const scale = Math.min(1, maxWidth / width);

    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setError("Não foi possível processar a foto.");
      return;
    }

    ctx.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Não foi possível criar a foto.");
          return;
        }

        const file = new File(
          [blob],
          `foto-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
            lastModified: Date.now(),
          }
        );

        onCapture(file);
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-black">
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-white"
            onClick={onClose}
            aria-label="Fechar câmera"
          >
            <X className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-white"
            onClick={switchCamera}
            disabled={starting}
            aria-label="Trocar câmera"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${
              facingMode === "user" ? "scale-x-[-1]" : ""
            }`}
          />

          {starting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center text-sm text-white">
                Abrindo câmera…
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-x-4 bottom-32 rounded-2xl bg-black/80 p-4 text-center text-sm text-white">
              <p>{error}</p>

              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                onClick={() => void startCamera(facingMode)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center bg-black px-4 py-6">
          <button
            type="button"
            onClick={capturePhoto}
            disabled={starting || !!error}
            aria-label="Tirar foto"
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 transition active:scale-90 disabled:opacity-40"
          >
            <span className="h-14 w-14 rounded-full bg-white" />
          </button>
        </div>

        <div className="absolute bottom-28 left-0 right-0 text-center text-xs text-white/70">
          {facingMode === "user" ? "Câmera frontal" : "Câmera traseira"}
        </div>

        <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/50">
          Toque no botão ↻ para trocar a câmera
        </div>
      </div>
    </div>
  );
}
