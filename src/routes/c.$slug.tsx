import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityMembersList } from "@/features/communities/components/CommunityMembersList";
import { Check, Globe, ImagePlus, Lock, Pencil, Users, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  communityBySlugOptions,
  viewerMembershipOptions,
  joinRequestsOptions,
  categoriesOptions,
} from "@/features/communities/queries";
import {
  joinCommunity,
  leaveCommunity,
  requestJoin,
  cancelJoinRequest,
  updateCommunity,
  uploadCommunityMedia,
  decideJoinRequest,
} from "@/features/communities/api";
import { supabase } from "@/integrations/supabase/client";
import { PostComposer } from "@/features/feed/components/PostComposer";
import { FeedList } from "@/features/feed/components/FeedList";
import { feedKeys } from "@/features/feed/queries";
import type { Profile } from "@/features/profile/types";
import { CommunityMedia } from "@/features/communities/components/CommunityBadges";

export const Route = createFileRoute("/c/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Tibo` },
      { name: "description", content: `Comunidade ${params.slug} no Tibo.` },
    ],
  }),
  component: CommunityDetailPage,
  notFoundComponent: () => (
    <AppShell title="Comunidade" maxWidth="lg">
      <div className="py-16 text-center text-muted-foreground">Comunidade não encontrada.</div>
    </AppShell>
  ),
});

function CommunityDetailPage() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const { data: community, isLoading } = useQuery(communityBySlugOptions(slug));
  const [viewerId, setViewerId] = useState<string | null>(null);
  const { data: viewer } = useQuery(viewerMembershipOptions(community?.id));
  const { data: categories } = useQuery(categoriesOptions());
  const { data: joinRequests } = useQuery({ ...joinRequestsOptions(community?.id ?? ""), enabled: !!community?.id && community?.owner_id === viewerId });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRules, setEditRules] = useState("");
  const [editVisibility, setEditVisibility] = useState<"publica" | "privada">("publica");
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setViewerId(data.session?.user.id ?? null));
  }, []);
  const { data: me } = useQuery<Profile | null>({
    queryKey: ["profile", "me", viewerId ?? "anon"],
    queryFn: async () => {
      if (!viewerId) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", viewerId).maybeSingle();
      return (data as Profile | null) ?? null;
    },
    enabled: !!viewerId,
  });

  const cid = community?.id ?? "";
  const refetchAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["community", "slug", slug] }),
      cid
        ? qc.invalidateQueries({ queryKey: ["community", "viewer", cid] })
        : Promise.resolve(),
      cid
        ? qc.invalidateQueries({ queryKey: ["community", "members", cid] })
        : Promise.resolve(),
      cid
        ? qc.invalidateQueries({ queryKey: ["community", "requests", cid] })
        : Promise.resolve(),
    ]);
  };
  const saveCommunity = async () => {
    if (!community) return;
    if (editName.trim().length < 3) { toast.error("O nome precisa ter pelo menos 3 caracteres."); return; }
    setSaving(true);
    try {
      let banner_path = community.banner_path;
      if (coverFile) banner_path = await uploadCommunityMedia(community.id, coverFile, "cover");
      await updateCommunity(community.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        rules: editRules.trim() || null,
        visibility: editVisibility,
        category_id: editCategoryId || null,
        banner_path,
      });
      toast.success("Comunidade atualizada.");
      setEditing(false); setCoverFile(null);
      await refetchAll();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const startEditing = () => {
    setEditName(community?.name ?? "");
    setEditDescription(community?.description ?? "");
    setEditRules(community?.rules ?? "");
    setEditVisibility((community?.visibility ?? "publica") as "publica" | "privada");
    setEditCategoryId(community?.category_id ?? "");
    setEditing(true);
  };

  const joinMut = useMutation({
    mutationFn: () => joinCommunity(cid),
    onSuccess: async () => { toast.success("Você entrou na comunidade!"); await refetchAll(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const leaveMut = useMutation({
    mutationFn: () => leaveCommunity(cid),
    onSuccess: async () => { toast.success("Você saiu."); await refetchAll(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const requestMut = useMutation({
    mutationFn: () => requestJoin(cid),
    onSuccess: async () => { toast.success("Solicitação enviada."); await refetchAll(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelJoinRequest(id),
    onSuccess: async () => { toast.success("Solicitação cancelada."); await refetchAll(); },
  });

  // Realtime: refresh community feed on new posts
  useEffect(() => {
    if (!cid) return;
    const channel = supabase
      .channel(`community-feed-${cid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `community_id=eq.${cid}` },
        () => { qc.invalidateQueries({ queryKey: feedKeys.community(cid) }); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cid, qc]);

  if (isLoading) {
    return <AppShell title="Comunidade" maxWidth="lg"><div className="h-64 animate-pulse rounded-lg bg-muted" /></AppShell>;
  }
  if (!community) throw notFound();

  const isOwner = community.owner_id === viewerId;
  const isMember = isOwner || viewer?.isMember === true;
  const canPost = isMember;
  const canSeeFeed = community.visibility === "publica" || isMember;

  return (
    <AppShell title={community.name} maxWidth="lg" contentClassName="px-0 sm:px-0 pt-0 sm:pt-0">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary/60 to-accent/60 sm:h-56">
        {community.banner_path ? <CommunityMedia path={community.banner_path} alt={`Capa de ${community.name}`} className="h-full w-full object-cover" /> : null}
      </div>
      <div className="mx-auto max-w-4xl px-4 pb-10">
        <div className="-mt-8 mb-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{community.name}</h1>
                    {community.visibility === "privada" ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">/c/{community.slug}</p>
                  {community.description && (
                    <p className="mt-3 max-w-2xl text-sm">{community.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" />{community.member_count} membros</span>
                    {community.category && <Badge variant="secondary">{community.category.name}</Badge>}
                  </div>
                </div>
                <div>
                  {!viewer ? null : isMember ? (
                    viewer.role === "owner" ? (
                      <div className="flex flex-wrap gap-2">
                        <Badge>Dono</Badge>
                        <Button variant="outline" onClick={startEditing}><Pencil className="mr-2 h-4 w-4" />Editar comunidade</Button>
                      </div>
                    ) : (
                      <Button variant="outline" onClick={() => leaveMut.mutate()} disabled={leaveMut.isPending}>
                        Sair da comunidade
                      </Button>
                    )
                  ) : viewer.pendingRequestId ? (
                    <Button variant="outline" onClick={() => cancelMut.mutate(viewer.pendingRequestId!)} disabled={cancelMut.isPending}>
                      Cancelar solicitação
                    </Button>
                  ) : community.visibility === "publica" ? (
                    <Button onClick={() => joinMut.mutate()} disabled={joinMut.isPending}>Entrar</Button>
                  ) : (
                    <Button onClick={() => requestMut.mutate()} disabled={requestMut.isPending}>Solicitar entrada</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {editing && isOwner && (
            <Card className="mt-4 border-primary/30">
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between"><div><h2 className="font-semibold">Editar comunidade</h2><p className="text-xs text-muted-foreground">Altere os detalhes sem perder a identidade visual do Tibo.</p></div><Button variant="ghost" size="icon" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5"><label className="text-sm font-medium">Nome</label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Privacidade</label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={editVisibility} onChange={(e) => setEditVisibility(e.target.value as "publica" | "privada")}><option value="publica">Pública</option><option value="privada">Privada</option></select></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Categoria</label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)}><option value="">Sem categoria</option>{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div className="space-y-1.5 sm:col-span-2"><label className="text-sm font-medium">Descrição</label><Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} maxLength={500} /></div>
                  <div className="space-y-1.5 sm:col-span-2"><label className="text-sm font-medium">Regras</label><Textarea value={editRules} onChange={(e) => setEditRules(e.target.value)} maxLength={5000} /></div>
                  <div className="space-y-1.5 sm:col-span-2"><label className="text-sm font-medium">Foto de capa</label><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground hover:border-primary"><ImagePlus className="h-5 w-5" />{coverFile ? coverFile.name : "Escolher uma imagem"}<input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} /></label></div>
                </div>
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button><Button onClick={saveCommunity} disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</Button></div>
              </CardContent>
            </Card>
          )}

          {isOwner && (joinRequests?.length ?? 0) > 0 && (
            <Card className="mt-4">
              <CardContent className="space-y-3 pt-6"><div><h2 className="font-semibold">Solicitações de entrada</h2><p className="text-xs text-muted-foreground">Aprove ou recuse pedidos para esta comunidade privada.</p></div>
                {(joinRequests ?? []).map((req) => <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div><div className="font-medium">{req.profile?.nome || `@${req.profile?.username}`}</div><div className="text-xs text-muted-foreground">@{req.profile?.username}</div></div><div className="flex gap-2"><Button size="sm" onClick={async () => { try { await decideJoinRequest(req.id, true); toast.success("Membro aprovado"); await refetchAll(); } catch (e) { toast.error((e as Error).message); } }}><Check className="mr-1 h-4 w-4" />Aprovar</Button><Button size="sm" variant="outline" onClick={async () => { try { await decideJoinRequest(req.id, false); toast.success("Solicitação recusada"); await refetchAll(); } catch (e) { toast.error((e as Error).message); } }}><X className="mr-1 h-4 w-4" />Recusar</Button></div></div>)}
              </CardContent>
            </Card>
          )}

          {!isMember && community.visibility === "privada" && (
            <Card className="mt-4">
              <CardContent className="py-8 text-center text-muted-foreground">
                Esta comunidade é privada. Solicite entrada para ver as publicações.
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="posts" className="mt-6">
            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="inline-flex w-full min-w-max justify-start gap-1">
                <TabsTrigger value="posts" className="min-h-10 flex-1 px-4">Publicações</TabsTrigger>
                <TabsTrigger value="membros" className="min-h-10 flex-1 px-4">Membros</TabsTrigger>
                <TabsTrigger value="sobre" className="min-h-10 flex-1 px-4">Sobre</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="posts" className="mt-4">
              {canSeeFeed ? (
                <div className="space-y-4">
                  {canPost && me && <PostComposer me={me} communityId={community.id} />}
                  <FeedList
                    scope={{ communityId: community.id }}
                    currentUserId={viewerId}
                    emptyMessage={canPost ? "Seja o primeiro a publicar nesta comunidade!" : "Nenhuma publicação ainda."}
                  />
                </div>
              ) : (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Entre na comunidade para ver as publicações.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="membros" className="mt-4">
              {canSeeFeed ? (
                <CommunityMembersList communityId={community.id} />
              ) : (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Apenas membros podem ver a lista de membros.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="sobre" className="mt-4 space-y-4">
              <Card>
                <CardContent className="space-y-2 pt-6">
                  <h2 className="font-semibold">Sobre</h2>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {community.description || "Esta comunidade ainda não tem descrição."}
                  </p>
                </CardContent>
              </Card>
              {community.rules ? (
                <Card>
                  <CardContent className="space-y-2 pt-6">
                    <h2 className="font-semibold">Regras</h2>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{community.rules}</p>
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}