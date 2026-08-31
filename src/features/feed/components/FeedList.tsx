import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Newspaper } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/ui/state";
import {
  communityPostsInfiniteOptions,
  homeFeedInfiniteOptions,
  userPostsInfiniteOptions,
} from "../queries";
import { PostCard } from "./PostCard";
import { PostSkeleton } from "./PostSkeleton";
import { SponsoredAdCard } from "@/features/business/components/SponsoredAdCard";
import { SuggestedPeopleCard } from "./SuggestedPeopleCard";

type Scope = "home" | { userId: string } | { communityId: string };

interface FeedListProps {
  scope: Scope;
  currentUserId: string | null;
  emptyMessage?: string;
  textOnly?: boolean;
}

export function FeedList({ scope, currentUserId, emptyMessage, textOnly = false }: FeedListProps) {
  const isHome = scope === "home";
  const isUser = typeof scope === "object" && "userId" in scope;
  const isCommunity = typeof scope === "object" && "communityId" in scope;
  const homeQ = useInfiniteQuery({ ...homeFeedInfiniteOptions(), enabled: isHome });
  const userQ = useInfiniteQuery({
    ...userPostsInfiniteOptions(isUser ? (scope as { userId: string }).userId : ""),
    enabled: isUser,
  });
  const commQ = useInfiniteQuery({
    ...communityPostsInfiniteOptions(isCommunity ? (scope as { communityId: string }).communityId : ""),
    enabled: isCommunity,
  });
  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error, refetch,
  } = isHome ? homeQ : isUser ? userQ : commQ;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { rootMargin: "400px" });
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => <PostSkeleton key={i} />)}
      </div>
    );
  }
  if (isError) {
    return (
      <ErrorState
        title="Não foi possível carregar as publicações"
        description={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  }
  const allPosts = data?.pages.flatMap((p) => p.posts) ?? [];

  // No perfil, "Publicações" mostra somente posts de texto.
  // Fotos e vídeos ficam nas abas próprias.
  const posts = textOnly
    ? allPosts.filter((p) => p.images.length === 0 && !p.video)
    : allPosts;

  if (posts.length === 0 && !hasNextPage) {
    return (
      <EmptyState
        icon={<Newspaper className="h-6 w-6" />}
        title={emptyMessage ?? "Nada por aqui ainda"}
        description="Siga amigos e entre em comunidades para ver publicações no seu feed."
      />
    );
  }
  return (
    <div className="space-y-4">
      {isHome ? <SuggestedPeopleCard /> : null}
      {posts.map((p, index) => (
        <div key={p.post.id}>
          <PostCard post={p} currentUserId={currentUserId} />
          {isHome && index === 2 ? <SponsoredAdCard /> : null}
        </div>
      ))}
      <div ref={sentinelRef} className="flex justify-center py-4">
        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {!hasNextPage && posts.length > 0 && (
          <p className="text-xs text-muted-foreground">Você chegou ao fim ✨</p>
        )}
      </div>
    </div>
  );
}