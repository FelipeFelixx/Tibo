import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { UserListItem } from "@/features/social/UserListItem";
import { fetchFriends, fetchPendingFriendRequests } from "@/features/social/api";
import { profileByUsernameOptions } from "@/features/profile/queries";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cancelFriendship, respondFriendRequest } from "@/features/profile/api";
import { toast } from "sonner";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/u/$username/amigos")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(profileByUsernameOptions(params.username)),
  head: ({ params }) => ({ meta: [{ title: `Amigos de @${params.username} · Tibo` }] }),
  component: FriendsPage,
});

function FriendsPage() {
  const { username } = Route.useParams();
  const { data: profile } = useQuery(profileByUsernameOptions(username));
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setViewerId(data.session?.user.id ?? null)); }, []);

  const friendsQ = useQuery({
    queryKey: ["social", "friends", profile?.id],
    queryFn: () => fetchFriends(profile!.id),
    enabled: !!profile?.id,
  });
  const pendingQ = useQuery({
    queryKey: ["social", "friend-requests"],
    queryFn: fetchPendingFriendRequests,
    enabled: !!viewerId && viewerId === profile?.id,
  });

  const friends = useMemo(() => {
    const list = friendsQ.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => u.username.toLowerCase().includes(q) || (u.nome ?? "").toLowerCase().includes(q));
  }, [friendsQ.data, search]);

  const isSelf = viewerId && profile && viewerId === profile.id;

  return (
    <AppShell title={`Amigos de @${username}`} maxWidth="lg">
      <div className="space-y-6">
        {isSelf && (pendingQ.data?.length ?? 0) > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Solicitações pendentes</h2>
            {pendingQ.data!.map((req) => (
              <UserListItem
                key={req.id}
                user={req.requester}
                trailing={
                  <div className="flex gap-2">
                    <Button size="sm" onClick={async () => { await respondFriendRequest(req.id, "accepted"); toast.success("Aceito"); pendingQ.refetch(); friendsQ.refetch(); }}>Aceitar</Button>
                    <Button size="sm" variant="outline" onClick={async () => { await cancelFriendship(req.id); toast.success("Recusado"); pendingQ.refetch(); }}>Recusar</Button>
                  </div>
                }
              />
            ))}
          </section>
        )}
        <section className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar amigos" className="pl-9" />
          </div>
          {friendsQ.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {friends.length === 0 && !friendsQ.isLoading && (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Nenhum amigo encontrado.</p>
          )}
          <div className="space-y-2">
            {friends.map((u) => (
              <UserListItem
                key={u.id}
                user={u}
                trailing={
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/u/$username" params={{ username: u.username }}>Ver perfil</Link>
                  </Button>
                }
              />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}