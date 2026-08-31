import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useRef } from "react";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { myProfileOptions } from "@/features/profile/queries";
import { clipsInfiniteOptions } from "@/features/clips/queries";
import { ClipViewer } from "@/features/clips/components/ClipViewer";
import { useI18n } from "@/i18n";

const searchSchema = z.object({
  postId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/clips")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Clips · Tibo" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(myProfileOptions()),
  component: ClipsPage,
});

function ClipsPage() {
  const { t } = useI18n();
  const { data: me } = useSuspenseQuery(myProfileOptions());
  const { postId } = Route.useSearch();
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(clipsInfiniteOptions());
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "900px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  useEffect(() => {
    if (!postId || !posts.length) return;
    const target = document.getElementById(`clip-${postId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [postId, posts.length]);

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-black text-white">
      <main className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain pb-[env(safe-area-inset-bottom)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-center pt-[max(0.9rem,env(safe-area-inset-top))]">
          <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-bold backdrop-blur-xl">
            Tibo <span className="text-primary">Clips</span>
          </div>
        </header>

        {isLoading ? (
          <div className="grid h-full place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-white/70" />
          </div>
        ) : isError ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <p className="font-semibold">{t("clips.loadError", "Não foi possível carregar os Clips.")}</p>
              <p className="mt-2 text-sm text-white/60">{(error as Error).message}</p>
            </div>
          </div>
        ) : posts.length ? (
          <>
            {posts.map((post) => (
              <ClipViewer key={post.post.id} post={post} currentUserId={me?.id ?? null} />
            ))}
            <div ref={sentinelRef} className="flex h-20 snap-start items-center justify-center">
              {isFetchingNextPage ? <Loader2 className="h-5 w-5 animate-spin text-white/60" /> : null}
            </div>
          </>
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <p className="text-xl font-semibold">{t("clips.empty", "Ainda não há Clips")}</p>
              <p className="mt-2 text-sm text-white/60">{t("clips.emptyDesc", "Publique um vídeo e ele entra automaticamente nos Clips.")}</p>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
