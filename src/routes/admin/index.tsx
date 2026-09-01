import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldAlert,
  Users,
  Award,
  BarChart3,
  UserPlus,
  Trash2,
  LifeBuoy,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { isPlatformAdmin } from "@/features/admin/business";
import {
  getAdminOverview,
  listPlatformTeam,
  upsertPlatformTeam,
  removePlatformTeam,
  listBadges,
  createBadge,
  uploadBadgeImage,
  grantBadge,
  adminDeleteBadge,
  type AdminBadge,
} from "@/features/admin/platform";
import {
  listModerationCases,
  updateModerationCase,
  assignModerationCase,
  type ModerationCase,
  type ModerationStatus,
} from "@/features/admin/moderation";
import { supabase } from "@/integrations/supabase/client";

type AdminUser = {
  user_id: string;
  username: string;
  display_name: string;
};

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Tibo Admin — Visão geral" }, { name: "robots", content: "noindex" }] }),
  component: AdminHome,
});

const metricLabels: Record<string, string> = { users: "Usuários", active_users_30d: "Ativos (30d)", posts: "Publicações", clips: "Clips", communities: "Comunidades", businesses: "Empresas", verified_businesses: "Empresas verificadas", pending_business_reviews: "Business em análise", active_campaigns: "Campanhas ativas", leads: "Leads", badges: "Emblemas", badge_grants: "Emblemas concedidos", reports: "Denúncias" };

function AdminHome() {
  const access = useQuery({ queryKey: ["platform-admin-access"], queryFn: isPlatformAdmin });
  if (access.isLoading) return <AppShell title="Tibo Admin"><div className="py-16 text-center text-muted-foreground">Verificando acesso…</div></AppShell>;
  if (access.data !== true) return <AppShell title="Tibo Admin"><Card><CardContent className="py-16 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-destructive" /><h1 className="mt-3 font-semibold">Acesso administrativo negado</h1><p className="mt-1 text-sm text-muted-foreground">Esta área só fica disponível para contas autorizadas.</p></CardContent></Card></AppShell>;
  return <AppShell title="Tibo Admin" maxWidth="xl"><AdminWorkspace /></AppShell>;
}

function AdminWorkspace() {
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: getAdminOverview, staleTime: 30_000 });
  const badges = useQuery({ queryKey: ["admin-badges"], queryFn: listBadges });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe o Tibo inteiro para tomar decisões de produto,
          comunidade, Business e segurança.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Object.entries(overview.data ?? {}).map(([key, value]) => (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">
                {metricLabels[key] ?? key}
              </div>
              <div className="mt-1 text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">Suporte</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Gerencie chamados e atendimentos dos usuários.
                </p>
                <Button asChild className="mt-4">
                  <a href="/admin/suporte">Abrir suporte</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Flag className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">Denúncias</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Analise denúncias e acompanhe ações de moderação.
                </p>
                <Button asChild className="mt-4">
                  <a href="/admin/denuncias">Abrir denúncias</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="badges">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="badges">
            <Award className="mr-2 h-4 w-4" />
            Emblemas
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="mr-2 h-4 w-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="business">
            <BarChart3 className="mr-2 h-4 w-4" />
            Business
          </TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="mt-4">
          <BadgeManager badges={badges.data ?? []} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamManager />
        </TabsContent>

        <TabsContent value="business" className="mt-4">
          <Card>
            <CardContent className="py-10 text-center">
              <Button asChild>
                <a href="/admin/negocios">
                  Abrir revisão de Tibo Business
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BadgeManager({ badges }: { badges: AdminBadge[] }) {
  const qc = useQueryClient();

  const owner = useQuery({
    queryKey: ["platform-admin-owner"],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
          rpc: (
            functionName: string
          ) => Promise<{
            data: boolean | null;
            error: unknown;
          }>;
        }).rpc(
        "is_platform_owner",
      );

      if (error) throw error;
      return data === true;
    },
    staleTime: 60_000,
  });

  const isOwner = owner.data === true;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("1");
  const [file, setFile] = useState<File | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<{
    user_id: string;
    username: string;
    display_name: string;
  } | null>(null);
  const [selectedBadge, setSelectedBadge] = useState("");

  const users = useQuery({
    queryKey: ["admin-users", userQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_find_users", {
        _query: userQuery,
      });

      if (error) throw error;
      return data ?? [];
    },
    enabled: userQuery.trim().length > 0,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("Escolha a imagem do emblema");
      }

      const path = await uploadBadgeImage(file);

      return createBadge({
        name,
        description,
        imagePath: path,
        category,
        level: Number(level) || 1,
      });
    },
    onSuccess: () => {
      toast.success("Emblema criado");
      setName("");
      setDescription("");
      setCategory("");
      setLevel("1");
      setFile(null);

      qc.invalidateQueries({
        queryKey: ["admin-badges"],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grant = useMutation({
    mutationFn: () => {
      if (!selectedUser) {
        throw new Error("Selecione um usuário.");
      }

      if (!selectedBadge) {
        throw new Error("Selecione um emblema.");
      }

      return grantBadge(selectedUser.user_id, selectedBadge);
    },
    onSuccess: () => {
      toast.success("Emblema concedido");
      setSelectedUser(null);
      setSelectedBadge("");
      setUserQuery("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (badgeId: string) => adminDeleteBadge(badgeId),
    onSuccess: () => {
      toast.success("Emblema excluído");

      qc.invalidateQueries({
        queryKey: ["admin-badges"],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle>Criar emblema</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              <div>
                <Label>Nível</Label>
                <Input
                  type="number"
                  min="1"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Imagem</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setFile(e.target.files?.[0] ?? null)
                }
              />
            </div>

            <Button
              className="w-full"
              disabled={!name.trim() || !file || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Criando…" : "Criar emblema"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Conceder emblema</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Input
            placeholder="Buscar @username"
            value={userQuery}
            onChange={(e) => {
              setUserQuery(e.target.value);
              setSelectedUser(null);
            }}
          />

          {users.data?.length ? (
            <div className="max-h-32 space-y-1 overflow-auto">
              {users.data.map((u: AdminUser) => (
                <button
                  key={u.user_id}
                  type="button"
                  className={`w-full rounded-lg border p-2 text-left text-sm ${
                    selectedUser?.user_id === u.user_id
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedUser(u);
                    setUserQuery(`@${u.username}`);
                  }}
                >
                  @{u.username}
                  <span className="ml-2 text-muted-foreground">
                    {u.display_name}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={selectedBadge}
            onChange={(e) => setSelectedBadge(e.target.value)}
          >
            <option value="">Selecione o emblema</option>

            {badges.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · Nível {b.level}
              </option>
            ))}
          </select>

          <Button
            className="w-full"
            disabled={
              !selectedUser ||
              !selectedBadge ||
              grant.isPending
            }
            onClick={() => grant.mutate()}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {grant.isPending ? "Concedendo…" : "Conceder"}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Emblemas cadastrados</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {badges.map((b) => (
              <div
                key={b.id}
                className="relative rounded-xl border p-3"
              >
                <div className="pr-8 font-medium">
                  {b.name}
                </div>

                <div className="text-xs text-muted-foreground">
                  {b.category || "Geral"} · Nível {b.level}
                </div>

                <Badge className="mt-2">
                  {b.active ? "Ativo" : "Inativo"}
                </Badge>

                {isOwner ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={remove.isPending}
                    aria-label={`Excluir emblema ${b.name}`}
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Excluir o emblema "${b.name}"?\n\nAs concessões desse emblema também serão removidas.`,
                      );

                      if (confirmed) {
                        remove.mutate(b.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamManager() {
  const qc=useQueryClient(); const team=useQuery({queryKey:["admin-team"],queryFn:listPlatformTeam}); const [username,setUsername]=useState(""); const [role,setRole]=useState("reviewer"); const [selected,setSelected]=useState<AdminUser | null>(null); const users=useQuery({queryKey:["admin-team-users",username],queryFn:async()=>{const db=supabase;const {data,error}=await db.rpc("admin_find_users",{_query:username});if(error)throw error;return data??[]},enabled:username.trim().length>0}); const save=useMutation({mutationFn:()=>{if(!selected)throw new Error("Selecione um usuário.");return upsertPlatformTeam(selected.user_id,role)},onSuccess:()=>{toast.success("Permissão atualizada");qc.invalidateQueries({queryKey:["admin-team"]})},onError:(e:Error)=>toast.error(e.message)}); const remove=useMutation({mutationFn:(id:string)=>removePlatformTeam(id),onSuccess:()=>{toast.success("Acesso removido");qc.invalidateQueries({queryKey:["admin-team"]})},onError:(e:Error)=>toast.error(e.message)});
  return <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Autorizar pessoa na administração</CardTitle></CardHeader><CardContent className="space-y-3"><Input placeholder="Buscar @username" value={username} onChange={e=>setUsername(e.target.value)} />{users.data?.length?<div className="space-y-1">{users.data.map((u: AdminUser)=><button key={u.user_id} className={`w-full rounded-lg border p-2 text-left text-sm ${selected?.user_id===u.user_id?"border-primary":""}`} onClick={()=>setSelected(u)}>@{u.username} · {u.display_name}</button>)}</div>:null}<select className="h-10 w-full rounded-md border bg-background px-3" value={role} onChange={e=>setRole(e.target.value)}><option value="reviewer">Administrador / revisor</option><option value="support">Suporte</option><option value="owner">Proprietário</option></select><Button className="w-full" disabled={!selected||save.isPending} onClick={()=>save.mutate()}>Autorizar</Button></CardContent></Card><Card><CardHeader><CardTitle>Equipe administrativa</CardTitle></CardHeader><CardContent className="space-y-2">{team.data?.map(m=><div key={m.user_id} className="flex items-center justify-between gap-2 rounded-xl border p-3"><div><div className="font-medium">@{m.username}</div><div className="text-xs text-muted-foreground">{m.display_name} · {m.role}</div></div><Button variant="ghost" size="icon" onClick={()=>remove.mutate(m.user_id)}><Trash2 className="h-4 w-4" /></Button></div>)}</CardContent></Card></div>;
}
