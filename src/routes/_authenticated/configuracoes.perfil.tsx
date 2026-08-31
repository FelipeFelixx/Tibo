import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { myProfileOptions } from "@/features/profile/queries";
import { EditProfileForm } from "@/features/profile/components/EditProfileForm";
import { PrivacySettingsForm } from "@/features/profile/components/PrivacySettingsForm";
import { ProfileSkeleton } from "@/features/profile/components/ProfileSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/configuracoes/perfil")({
  head: () => ({ meta: [{ title: "Editar perfil · Tibo" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(myProfileOptions()),
  pendingComponent: () => <AppShell title="Configurações" maxWidth="lg"><ProfileSkeleton /></AppShell>,
  errorComponent: ProfileSettingsError,

  notFoundComponent: () => <AppShell title="Configurações"><div className="p-6">Perfil não encontrado.</div></AppShell>,
  component: EditPage,
});


function ProfileSettingsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <AppShell title="Configurações" maxWidth="lg">
      <div className="p-6 text-center">
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

function EditPage() {
  const { data: profile } = useSuspenseQuery(myProfileOptions());
  if (!profile) return null;

  return (
    <AppShell title="Configurações do perfil" maxWidth="lg">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Configurações do perfil</h1>
      <p className="mt-1 text-sm text-muted-foreground">Atualize seus dados e privacidade.</p>
      <Tabs defaultValue="perfil" className="mt-8">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="privacidade">Privacidade</TabsTrigger>
        </TabsList>
        <TabsContent value="perfil" className="mt-6"><EditProfileForm profile={profile} /></TabsContent>
        <TabsContent value="privacidade" className="mt-6"><PrivacySettingsForm profile={profile} /></TabsContent>
      </Tabs>
    </AppShell>
  );
}