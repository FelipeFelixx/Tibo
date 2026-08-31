import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { myProfileOptions } from "@/features/profile/queries";
import { PostComposer } from "@/features/feed/components/PostComposer";
import { PostSkeleton } from "@/features/feed/components/PostSkeleton";

export const Route = createFileRoute("/_authenticated/publicar")({
  head: () => ({ meta: [{ title: "Publicar · Tibo" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(myProfileOptions()),
  pendingComponent: () => <AppShell title="Publicar"><PostSkeleton /></AppShell>,
  errorComponent: PublishError,

  component: PublishPage,
});


function PublishError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <AppShell title="Publicar">
      <div className="p-4 text-center">
        <p>{error.message}</p>
        <Button
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    </AppShell>
  );
}

function PublishPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { data: me } = useSuspenseQuery(myProfileOptions());

  if (!me) return null;

  return (
    <AppShell title={t("nav.publishTitle", "Publicar")}>
      <PostComposer
        me={me}
        onPublished={() => {
          router.navigate({ to: "/feed" });
        }}
      />
    </AppShell>
  );
}