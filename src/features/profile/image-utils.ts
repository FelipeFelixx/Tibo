export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface ResizeOptions {
  maxWidth: number;
  maxHeight: number;
  quality?: number;
  mimeType?: string;
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return "Formato inválido. Use JPG, PNG ou WebP.";
  }
  if (file.size > MAX_FILE_SIZE) return "Arquivo maior que 5MB.";
  return null;
}

export async function resizeImage(file: File, opts: ResizeOptions): Promise<File> {
  const { maxWidth, maxHeight, quality = 0.85, mimeType = "image/webp" } = opts;
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao processar imagem"))),
      mimeType,
      quality,
    );
  });
  const ext = mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg";
  return new File([blob], `image.${ext}`, { type: mimeType });
}

export const AVATAR_RESIZE: ResizeOptions = { maxWidth: 512, maxHeight: 512, quality: 0.88 };
export const COVER_RESIZE: ResizeOptions = { maxWidth: 1600, maxHeight: 600, quality: 0.85 };