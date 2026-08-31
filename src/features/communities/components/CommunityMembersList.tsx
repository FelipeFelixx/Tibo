import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Loader2, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/state";
import { SignedImage } from "@/features/profile/components/SignedImage";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";
import { membersInfiniteOptions } from "../queries";

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  admin: "Admin",
  moderator: "Moderador",
  member: "Membro",
};

export function CommunityMembersList({ communityId }: { communityId: string }) {
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(membersInfiniteOptions(communityId));

  if (isLoading) return <ListSkeleton rows={5} />;
  if (isError) {
    return (
      <ErrorState
        title="Não foi possível carregar os membros"
        description={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  }

  const members = data?.pages.flatMap((p) => p.items) ?? [];
  if (members.length === 0) {
    return <EmptyState icon={<Users className="h-6 w-6" />} title="Nenhum membro ainda" />;
  }

  return (
    <div className="space-y-3">
      {members.map((m) => {
        const name =
          [m.profile?.nome, m.profile?.sobrenome].filter(Boolean).join(" ") || m.profile?.username || "Usuário";
        return (
          <div
            key={m.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4"
          >
            <Link
              to="/u/$username"
              params={{ username: m.profile?.username ?? "" }}
              className="flex min-w-0 items-center gap-3"
            >
              <Avatar className="h-11 w-11 shrink-0">
                <SignedAvatarImage
                  bucket="avatars"
                  path={m.profile?.avatar_url ?? null}
                  alt={name}
                  className="h-full w-full object-cover"
                />
                <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-medium">{name}</span>
                  {m.profile?.verificado ? <BadgeCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden /> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">@{m.profile?.username}</p>
              </div>
            </Link>
            <Badge variant={m.role === "member" ? "secondary" : "default"} className="shrink-0">
              {ROLE_LABEL[m.role] ?? m.role}
            </Badge>
          </div>
        );
      })}
      {hasNextPage ? (
        <Button variant="outline" className="min-h-10 w-full" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Carregar mais
        </Button>
      ) : null}
    </div>
  );
}
