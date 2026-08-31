import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { UserListItem } from "@/features/social/UserListItem";
import { fetchFollowers } from "@/features/social/api";
import { profileByUsernameOptions } from "@/features/profile/queries";
import { FollowButton } from "@/features/social/FollowButton";

export const Route = createFileRoute("/_authenticated/u/$username/seguidores")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(profileByUsernameOptions(params.username)),
  head: ({ params }) => ({ meta: [{ title: `Seguidores de @${params.username} · Tibo` }] }),
  component: FollowersPage,
});

function FollowersPage() {
  const { username } = Route.useParams();
  const { data: profile } = useQuery(profileByUsernameOptions(username));
  const q = useQuery({
    queryKey: ["social", "followers", profile?.id],
    queryFn: () => fetchFollowers(profile!.id),
    enabled: !!profile?.id,
  });
  return (
    <AppShell title={`Seguidores de @${username}`} maxWidth="lg">
      <div className="space-y-2">
        {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {q.data?.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Ninguém segue este perfil ainda.</p>
        )}
        {q.data?.map((u) => (
          <UserListItem key={u.id} user={u} trailing={<FollowButton targetId={u.id} />} />
        ))}
      </div>
    </AppShell>
  );
}