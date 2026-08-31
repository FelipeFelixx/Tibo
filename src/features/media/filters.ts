export interface FilterState {
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  sepia: number;
  blur: number;
}

export const DEFAULT_FILTER: FilterState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
};

export interface FilterPreset {
  key: string;
  label: string;
  state: FilterState;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { key: "normal", label: "Original", state: DEFAULT_FILTER },
  { key: "pb", label: "Preto e branco", state: { ...DEFAULT_FILTER, grayscale: 100, contrast: 110 } },
  { key: "vintage", label: "Vintage", state: { ...DEFAULT_FILTER, sepia: 45, saturation: 85, contrast: 95, brightness: 105 } },
  { key: "hdr", label: "HDR", state: { ...DEFAULT_FILTER, contrast: 135, saturation: 130, brightness: 105 } },
  { key: "nitidez", label: "Nitidez", state: { ...DEFAULT_FILTER, contrast: 125, saturation: 112 } },
  { key: "desfoque", label: "Desfoque", state: { ...DEFAULT_FILTER, blur: 3 } },
  { key: "frio", label: "Frio", state: { ...DEFAULT_FILTER, saturation: 118, brightness: 103, contrast: 105 } },
];

export function filterToCss(f: FilterState): string {
  return [
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturation}%)`,
    f.grayscale ? `grayscale(${f.grayscale}%)` : "",
    f.sepia ? `sepia(${f.sepia}%)` : "",
    f.blur ? `blur(${f.blur}px)` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export interface StickerOverlay {
  id: string;
  emoji: string;
  /** relative 0..1 */
  x: number;
  y: number;
  size: number;
}

export interface TextOverlay {
  value: string;
  color: string;
  /** relative 0..1 */
  y: number;
}

export interface MediaOverlays {
  text: TextOverlay | null;
  stickers: StickerOverlay[];
}

export const EMPTY_OVERLAYS: MediaOverlays = { text: null, stickers: [] };

/**
 * Bakes filters + overlays into a new WebP File using a canvas.
 */
export async function renderFilteredImage(
  file: File,
  filter: FilterState,
  overlays: MediaOverlays,
  maxSize = 1440,
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
  const width = Math.round(bitmap.width * ratio);
  const height = Math.round(bitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  ctx.filter = filterToCss(filter);
  ctx.drawImage(bitmap, 0, 0, width, height);
  ctx.filter = "none";
  bitmap.close?.();

  overlays.stickers.forEach((s) => {
    const px = Math.max(24, Math.round((s.size / 100) * width));
    ctx.font = `${px}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.emoji, s.x * width, s.y * height);
  });

  if (overlays.text?.value.trim()) {
    const px = Math.round(width * 0.075);
    ctx.font = `700 ${px}px "Space Grotesk", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(2, px * 0.09);
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.fillStyle = overlays.text.color;
    const lines = wrapText(ctx, overlays.text.value.trim(), width * 0.86);
    const startY = overlays.text.y * height - ((lines.length - 1) * px * 1.2) / 2;
    lines.forEach((line, i) => {
      const y = startY + i * px * 1.2;
      ctx.strokeText(line, width / 2, y);
      ctx.fillText(line, width / 2, y);
    });
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao processar imagem"))), "image/webp", 0.88);
  });
  return new File([blob], `tibo-${Date.now()}.webp`, { type: "image/webp" });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  words.forEach((w) => {
    const candidate = current ? `${current} ${w}` : w;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 5);
}

export const STICKER_CHOICES = [
  "❤️", "🔥", "😂", "😍", "✨", "🎉", "👏", "💜", "🙌", "😎", "🥳", "🌈", "⭐", "🎵", "☀️", "🌙",
];

export const TEXT_COLORS = ["#ffffff", "#000000", "#6C3EF4", "#38BDF8", "#F43F5E", "#FACC15", "#22C55E"];

export async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = Number.isFinite(v.duration) ? Math.round(v.duration) : 0;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    v.src = url;
  });
}
export async function trimVideoFile(file: File, start: number, end: number): Promise<File> {
  if (start <= 0 && end <= 0) return file;
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.preload = "auto";
  video.muted = false;
  video.playsInline = true;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Não foi possível abrir o vídeo"));
  });
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const from = Math.max(0, Math.min(start, duration));
  const to = Math.max(from + 0.1, Math.min(end, duration));
  if (from <= 0 && to >= duration - 0.05) { URL.revokeObjectURL(url); return file; }

  const captureStream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream;
  if (!captureStream || typeof MediaRecorder === "undefined") {
    URL.revokeObjectURL(url);
    throw new Error("Seu navegador não suporta corte de vídeo neste dispositivo.");
  }

  const stream = captureStream.call(video);
  const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
  if (!mime) {
    URL.revokeObjectURL(url);
    throw new Error("Não foi possível preparar a edição do vídeo.");
  }
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const finished = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error("Falha ao gerar o vídeo editado"));
  });
  video.currentTime = from;
  await new Promise<void>((resolve) => { video.onseeked = () => resolve(); });
  recorder.start(200);
  await video.play();
  await new Promise<void>((resolve) => {
    const tick = () => {
      if (video.currentTime >= to || video.ended) { video.pause(); recorder.stop(); resolve(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await finished;
  stream.getTracks().forEach((track) => track.stop());
  URL.revokeObjectURL(url);
  const blob = new Blob(chunks, { type: mime });
  return new File([blob], `tibo-${Date.now()}.webm`, { type: mime });
}
