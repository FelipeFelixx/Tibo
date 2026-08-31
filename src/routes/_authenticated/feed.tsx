import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { myProfileOptions } from "@/features/profile/queries";
import { PostComposer } from "@/features/feed/components/PostComposer";
import { FeedList } from "@/features/feed/components/FeedList";
import { StoriesBar } from "@/features/stories/components/StoriesBar";
import { PostSkeleton } from "@/features/feed/components/PostSkeleton";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/i18n";

function feedTitle(t: ReturnType<typeof useI18n>["t"]) {
  return t("nav.feedTitle", "Feed");
}

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed · Tibo" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(myProfileOptions()),
  pendingComponent: () => <FeedPending />,
  errorComponent: ({ error, reset }) => <FeedError error={error} reset={reset} />,
  notFoundComponent: () => <FeedNotFound />,
  component: FeedPage,
});

function FeedPending() {
  const { t } = useI18n();
  return <AppShell title={feedTitle(t)} showBack={false}><PostSkeleton /></AppShell>;
}

function FeedError({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  return <AppShell title={feedTitle(t)} showBack={false}><div className="p-4 text-center"><p>{error.message}</p><Button onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</Button></div></AppShell>;
}

function FeedNotFound() {
  const { t } = useI18n();
  return <AppShell title={feedTitle(t)} showBack={false}><p className="p-4">Perfil não encontrado.</p></AppShell>;
}

function FeedPage() {
  const { t } = useI18n();
  const { data: me } = useSuspenseQuery(myProfileOptions());
  if (!me) return null;
  return (
    <AppShell title={t("nav.feedTitle", "Feed")} showBack={false}>
      <div className="space-y-4">
        <StoriesBar me={me} />
        <PostComposer me={me} textOnly />
        <FeedList scope="home" currentUserId={me.id} />
      </div>
    </AppShell>
  );
}