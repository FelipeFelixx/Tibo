import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Film, ImageIcon, Loader2, Video } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, GridSkeleton } from "@/components/ui/state";
import { SignedImage } from "@/features/profile/components/SignedImage";
import { userPostsInfiniteOptions } from "@/features/feed/queries";
import { PostCard } from "@/features/feed/components/PostCard";
import type { PostFull } from "@/features/feed/types";

type Mode = "fotos" | "clips";

const META: Record<Mode, { icon: typeof ImageIcon; empty: string; hint: string }> = {
  fotos: {
    icon: ImageIcon,
    empty: "Nenhuma foto publicada ainda",
    hint: "As fotos das publicações aparecem aqui.",
  },
  clips: {
    icon: Film,
    empty: "Nenhum Clip publicado ainda",
    hint: "Todos os vídeos publicados aparecem aqui.",
  },
};

function matches(mode: Mode, p: PostFull) {
  if (mode === "fotos") return p.images.length > 0 && !p.video;
  return !!p.video;
}

export function ProfileMediaGrid({
  userId,
  mode,
  currentUserId,
}: {
  userId: string;
  mode: Mode;
  currentUserId: string | null;
}) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(userPostsInfiniteOptions(userId));

  const [open, setOpen] = useState<PostFull | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          void fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );

    io.observe(el);

    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <GridSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="Não foi possível carregar as mídias"
        description={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  }

  const posts = (
    data?.pages.flatMap((page) => page.posts) ?? []
  ).filter((post) => matches(mode, post));

  const Icon = META[mode].icon;

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<Icon className="h-6 w-6" />}
        title={META[mode].empty}
        description={META[mode].hint}
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {posts.map((post) => {
          // Para vídeos/Clips, a capa própria tem prioridade.
          // Se não houver capa, usamos a primeira imagem da publicação.
          const cover =
            post.video?.thumbnail_path ??
            post.images[0]?.storage_path ??
            null;

          return (
            <button
              key={post.post.id}
              type="button"
              onClick={() => setOpen(post)}
              aria-label="Abrir publicação"
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted transition-opacity hover:opacity-90"
            >
              {cover ? (
                <SignedImage
                  bucket="post-media"
                  path={cover}
                  alt="Mídia da publicação"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-muted-foreground">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
              )}

              {mode !== "fotos" ? (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-background/80 p-1 text-foreground">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div ref={sentinelRef} className="flex justify-center py-4">
        {isFetchingNextPage ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <Dialog
        open={!!open}
        onOpenChange={(value) => {
          if (!value) setOpen(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto p-0">
          <DialogTitle className="sr-only">Publicação</DialogTitle>
          {open ? (
            <PostCard post={open} currentUserId={currentUserId} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
