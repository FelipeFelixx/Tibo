import { useState } from "react";
import { SignedImage } from "@/features/profile/components/SignedImage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PostImage } from "../types";

export function MediaGrid({ images }: { images: PostImage[] }) {
  const [open, setOpen] = useState<number | null>(null);

  if (!images.length) return null;

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-xl">
        <div
          className="flex snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain scrollbar-none"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setOpen(i)}
              className="relative min-w-full snap-center overflow-hidden bg-muted sm:min-w-[85%]"
              aria-label={`Ver foto ${i + 1} de ${images.length}`}
            >
              <div className="aspect-square sm:aspect-video">
                <SignedImage
                  bucket="post-media"
                  path={img.storage_path}
                  alt={`Foto ${i + 1} do post`}
                  className="h-full w-full object-cover"
                />
              </div>

              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-2 py-1">
                  {images.map((_, dotIndex) => (
                    <span
                      key={dotIndex}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        dotIndex === i ? "bg-white" : "bg-white/50",
                      )}
                    />
                  ))}
                </div>
              )}

              {images.length > 1 && (
                <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
                  {i + 1}/{images.length}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-5xl border-0 bg-black/95 p-0">
          {open !== null && (
            <div className="relative flex h-[80vh] items-center justify-center">
              <SignedImage
                bucket="post-media"
                path={images[open].storage_path}
                alt={`Foto ${open + 1} ampliada`}
                className="max-h-full max-w-full object-contain"
                loading="eager"
              />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setOpen((current) =>
                        current === null
                          ? 0
                          : (current - 1 + images.length) % images.length,
                      )
                    }
                    className="absolute left-3 rounded-full bg-black/60 px-4 py-3 text-xl text-white"
                    aria-label="Foto anterior"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setOpen((current) =>
                        current === null
                          ? 0
                          : (current + 1) % images.length,
                      )
                    }
                    className="absolute right-3 rounded-full bg-black/60 px-4 py-3 text-xl text-white"
                    aria-label="Próxima foto"
                  >
                    ›
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                    {open + 1}/{images.length}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
