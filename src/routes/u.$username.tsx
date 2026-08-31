import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { profileByUsernameOptions, viewerRelationshipOptions } from "@/features/profile/queries";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileStats } from "@/features/profile/components/ProfileStats";
import { ProfileActions } from "@/features/profile/components/ProfileActions";
import { ProfileSkeleton } from "@/features/profile/components/ProfileSkeleton";
import { AppShell } from "@/components/layout/AppShell";
import { FeedList } from "@/features/feed/components/FeedList";
import { UserCommunitiesList } from "@/features/social/UserCommunitiesList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileMediaGrid } from "@/features/profile/components/ProfileMediaGrid";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { ProfileBadges } from "@/features/profile/components/ProfileBadges";

function UserProfileError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <AppShell title="Perfil" maxWidth="lg">
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-xl font-semibold">Não foi possível carregar</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Tentar novamente
        </button>
      </div>
    </AppShell>
  );
}

export const Route = createFileRoute("/u/$username")({
  ssr: false,
  loader: async ({ params, context }) => {
    const profile = await context.queryClient.ensureQueryData(profileByUsernameOptions(params.username));
    if (!profile) throw notFound();
    return { username: params.username };
  },
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} · Tibo` },
      { name: "description", content: `Perfil de @${params.username} no Tibo.` },
      { property: "og:title", content: `@${params.username} · Tibo` },
    ],
  }),
  pendingComponent: () => <AppShell title="Perfil" maxWidth="lg"><ProfileSkeleton /></AppShell>,
  errorComponent: UserProfileError,

  notFoundComponent: () => (
    <AppShell title="Perfil" maxWidth="lg">
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-2xl font-semibold">Perfil não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Verifique o @username.</p>
      </div>
    </AppShell>
  ),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { data: profile } = useSuspenseQuery(profileByUsernameOptions(username));
  const [viewerId, setViewerId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setViewerId(data.session?.user.id ?? null));
  }, []);
  const { data: relationship } = useQuery(viewerRelationshipOptions(profile?.id));

  if (!profile) return null;

  const isOwner = viewerId === profile.id;
  const isPrivate = !profile.perfil_publico && !isOwner;

  return (
    <AppShell title={`@${profile.username}`} maxWidth="xl" contentClassName="px-0 sm:px-0 pt-0 sm:pt-0">
      <ProfileHeader
        profile={profile}
        actions={
          <ProfileActions
            targetUserId={profile.id}
            viewerId={viewerId}
            relationship={relationship ?? null}
            quemPodeAmizade={profile.quem_pode_amizade}
            quemPodeSeguir={profile.quem_pode_seguir}
            quemPodeMensagem={profile.quem_pode_mensagem}
          />
        }
        badges={<ProfileBadges userId={profile.id} isOwner={isOwner} />}
      />
      <div className="mx-auto max-w-4xl px-4 pb-16">
        <ProfileStats stats={profile.stats} username={profile.username} />
        {isPrivate ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold">Perfil privado</h2>
            <p className="mt-1 text-sm text-muted-foreground">O conteúdo deste perfil é privado. Você ainda pode enviar uma solicitação de amizade ou seguir, conforme as preferências da pessoa.</p>
          </div>
        ) : null}
        {!isPrivate ? <Tabs defaultValue="posts" className="mt-6">
          <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="inline-flex w-full min-w-max justify-start gap-1">
              <TabsTrigger value="posts" className="min-h-10 flex-1 px-4">Publicações</TabsTrigger>
              <TabsTrigger value="fotos" className="min-h-10 flex-1 px-4">Fotos</TabsTrigger>
              
              <TabsTrigger value="clips" className="min-h-10 flex-1 px-4">Clips</TabsTrigger>
              <TabsTrigger value="comunidades" className="min-h-10 flex-1 px-4">Comunidades</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="posts" className="mt-4">
            <FeedList
              scope={{ userId: profile.id }}
              currentUserId={viewerId}
              emptyMessage="Nenhuma publicação de texto ainda."
              textOnly
            />
          </TabsContent>
          <TabsContent value="fotos" className="mt-4">
            <ProfileMediaGrid userId={profile.id} mode="fotos" currentUserId={viewerId} />
          </TabsContent>
          <TabsContent value="clips" className="mt-4">
            <ProfileMediaGrid userId={profile.id} mode="clips" currentUserId={viewerId} />
          </TabsContent>
          <TabsContent value="comunidades" className="mt-4">
            <UserCommunitiesList userId={profile.id} />
          </TabsContent>
        </Tabs> : null}
      </div>
    </AppShell>
  );
}