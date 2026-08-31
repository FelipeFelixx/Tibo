import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchUserCommunities } from "./api";
import { SignedImage } from "@/features/profile/components/SignedImage";
import { Users, Lock } from "lucide-react";

export function UserCommunitiesList({ userId }: { userId: string }) {
  const q = useQuery({
    queryKey: ["social", "user-communities", userId],
    queryFn: () => fetchUserCommunities(userId),
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const comms = q.data ?? [];
  if (!comms.length) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Ainda não participa de nenhuma comunidade.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {comms.map((c) => (
        <Link
          key={c.id}
          to="/c/$slug"
          params={{ slug: c.slug }}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/40"
        >
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
            <SignedImage bucket="community-media" path={c.avatar_path} alt={c.name} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 truncate font-medium">
              {c.name}
              {c.visibility === "privada" && <Lock className="h-3 w-3 text-muted-foreground" />}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> {c.member_count} membros
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}