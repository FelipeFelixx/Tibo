import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldAlert,
  LifeBuoy,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isPlatformAdmin } from "@/features/admin/business";

type SupportStatus =
  | "open"
  | "in_progress"
  | "waiting_user"
  | "resolved"
  | "closed";

type SupportTicket = {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  assigned_to: string | null;
  assigned_username: string | null;
  assigned_display_name: string | null;
  category: string;
  subject: string;
  description: string;
  status: SupportStatus;
  priority: "low" | "normal" | "high" | "urgent";
  internal_notes: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export const Route = createFileRoute("/admin/suporte")({
  head: () => ({
    meta: [
      { title: "Tibo Admin — Suporte" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSupportPage,
});

const statusLabels: Record<SupportStatus | "all", string> = {
  all: "Todos",
  open: "Abertos",
  in_progress: "Em atendimento",
  waiting_user: "Aguardando usuário",
  resolved: "Resolvidos",
  closed: "Encerrados",
};

const priorityLabels: Record<SupportTicket["priority"], string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const categoryLabels: Record<string, string> = {
  general: "Geral",
  account: "Conta",
  security: "Segurança",
  reports: "Denúncias",
  technical: "Técnico",
  business: "Tibo Business",
  ads: "Tibo Ads",
  shop: "Tibo Shop",
  other: "Outro",
};

function AdminSupportPage() {
  const access = useQuery({
    queryKey: ["platform-admin-access"],
    queryFn: isPlatformAdmin,
  });

  if (access.isLoading) {
    return (
      <AppShell title="Tibo Admin">
        <div className="py-16 text-center text-muted-foreground">
          Verificando acesso…
        </div>
      </AppShell>
    );
  }

  if (access.data !== true) {
    return (
      <AppShell title="Tibo Admin">
        <Card>
          <CardContent className="py-16 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-3 font-semibold">
              Acesso administrativo negado
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta área só fica disponível para contas autorizadas.
            </p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return <SupportWorkspace />;
}

function SupportWorkspace() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SupportStatus | "all">("all");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [priority, setPriority] =
    useState<SupportTicket["priority"]>("normal");
  const [notes, setNotes] = useState("");
  const [resolution, setResolution] = useState("");

  const tickets = useQuery({
    queryKey: ["admin-support-tickets", status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "admin_list_support_tickets",
        {
          _status: status,
        },
      );

      if (error) throw error;

      return (data ?? []) as SupportTicket[];
    },
  });

  const update = useMutation({
    mutationFn: async (nextStatus: SupportStatus) => {
      if (!selected) {
        throw new Error("Selecione um chamado.");
      }

      const { error } = await supabase.rpc(
        "admin_update_support_ticket",
        {
          _ticket_id: selected.id,
          _status: nextStatus,
          _priority: priority,
          _internal_notes: notes.trim() || null,
          _resolution: resolution.trim() || null,
        },
      );

      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(null);
      setNotes("");
      setResolution("");
      setPriority("normal");

      queryClient.invalidateQueries({
        queryKey: ["admin-support-tickets"],
      });
    },
  });

  const assign = useMutation({
    mutationFn: async (assignedTo: string | null) => {
      if (!selected) {
        throw new Error("Selecione um chamado.");
      }

      const { error } = await supabase.rpc(
        "admin_assign_support_ticket",
        {
          _ticket_id: selected.id,
          _assigned_to: assignedTo,
        },
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-support-tickets"],
      });
    },
  });

  function selectTicket(ticket: SupportTicket) {
    setSelected(ticket);
    setPriority(ticket.priority);
    setNotes(ticket.internal_notes ?? "");
    setResolution(ticket.resolution ?? "");
  }

  const items = tickets.data ?? [];

  return (
    <AppShell title="Tibo Admin — Suporte" maxWidth="xl">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">
            Suporte
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie chamados e atendimentos dos usuários do Tibo.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5" />
              Chamados
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as SupportStatus | "all",
                )
              }
              className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:w-64"
            >
              {Object.entries(statusLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>

            {tickets.isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Carregando chamados…
              </div>
            ) : tickets.isError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Não foi possível carregar os chamados.
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
                Nenhum chamado encontrado.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => selectTicket(ticket)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/40 ${
                      selected?.id === ticket.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">
                          {ticket.subject}
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          @{ticket.username}
                          {" · "}
                          {ticket.display_name || "Usuário"}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                          {statusLabels[ticket.status]}
                        </span>

                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                          {priorityLabels[ticket.priority]}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      {categoryLabels[ticket.category] ??
                        ticket.category}
                      {" · "}
                      {new Date(
                        ticket.created_at,
                      ).toLocaleString("pt-BR")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selected ? (
          <Card>
            <CardHeader>
              <CardTitle>
                Detalhes do chamado
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Usuário
                  </div>

                  <div className="mt-1 flex items-center gap-2 font-medium">
                    <UserRound className="h-4 w-4" />
                    @{selected.username}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {selected.display_name}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">
                    Categoria
                  </div>

                  <div className="mt-1 font-medium">
                    {categoryLabels[selected.category] ??
                      selected.category}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Assunto
                </div>

                <div className="mt-1 font-medium">
                  {selected.subject}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Descrição
                </div>

                <p className="mt-1 whitespace-pre-wrap rounded-xl border bg-muted/30 p-4 text-sm">
                  {selected.description}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>

                  <select
                    id="support-status"
                    defaultValue={selected.status}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    onChange={(event) => {
                      const value =
                        event.target.value as SupportStatus;

                      update.mutate(value);
                    }}
                    disabled={update.isPending}
                  >
                    {Object.entries(statusLabels)
                      .filter(([value]) => value !== "all")
                      .map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Prioridade</Label>

                  <select
                    value={priority}
                    onChange={(event) =>
                      setPriority(
                        event.target.value as SupportTicket["priority"],
                      )
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {Object.entries(priorityLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>

                <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                  {selected.assigned_username
                    ? `@${selected.assigned_username} · ${
                        selected.assigned_display_name ?? ""
                      }`
                    : "Nenhum administrador atribuído"}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={assign.isPending}
                  onClick={() => assign.mutate(null)}
                >
                  Desatribuir
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Notas internas</Label>

                <Input
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Observações internas da equipe"
                />
              </div>

              <div className="space-y-2">
                <Label>Resolução</Label>

                <Input
                  value={resolution}
                  onChange={(event) =>
                    setResolution(event.target.value)
                  }
                  placeholder="Descreva a solução aplicada"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate("in_progress")
                  }
                >
                  Em atendimento
                </Button>

                <Button
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate("waiting_user")
                  }
                >
                  Aguardar usuário
                </Button>

                <Button
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate("resolved")
                  }
                >
                  Resolver
                </Button>

                <Button
                  variant="secondary"
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate("closed")
                  }
                >
                  Encerrar
                </Button>

                <Button
                  variant="outline"
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate("open")
                  }
                >
                  Reabrir
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
