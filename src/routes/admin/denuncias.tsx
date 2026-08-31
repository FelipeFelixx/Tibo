import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Flag,
  ShieldAlert,
  UserRound,
  XCircle,
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { isPlatformAdmin } from "@/features/admin/business";
import {
  listModerationCases,
  updateModerationCase,
  assignModerationCase,
  type ModerationCase,
  type ModerationDecision,
  type ModerationStatus,
} from "@/features/admin/moderation";

export const Route = createFileRoute("/admin/denuncias")({
  head: () => ({
    meta: [
      { title: "Tibo Admin — Denúncias" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReportsPage,
});

const statusLabels: Record<ModerationStatus, string> = {
  pending: "Pendente",
  under_review: "Em análise",
  resolved: "Resolvido",
  dismissed: "Descartado",
};

const decisionLabels: Record<ModerationDecision, string> = {
  no_action: "Nenhuma ação",
  content_removed: "Conteúdo removido",
  content_restricted: "Conteúdo restringido",
  account_restricted: "Conta restringida",
  account_suspended: "Conta suspensa",
  account_banned: "Conta banida",
  community_action: "Ação na comunidade",
  other: "Outra ação",
};

const reportTypeLabels: Record<string, string> = {
  post: "Publicação",
  comment: "Comentário",
  community: "Comunidade",
};

function AdminReportsPage() {
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

  return <ModerationCenter />;
}

function ModerationCenter() {
  const queryClient = useQueryClient();

  const [status, setStatus] = React.useState<ModerationStatus | "all">(
    "pending",
  );
  const [selected, setSelected] = React.useState<ModerationCase | null>(null);
  const [notes, setNotes] = React.useState("");
  const [decision, setDecision] = React.useState<ModerationDecision | "">("");

  const cases = useQuery({
    queryKey: ["admin-moderation-cases", status],
    queryFn: () => listModerationCases(status),
  });

  const update = useMutation({
    mutationFn: async (nextStatus: ModerationStatus) => {
      if (!selected) {
        throw new Error("Selecione um caso.");
      }

      await updateModerationCase({
        caseId: selected.id,
        status: nextStatus,
        decision: decision || null,
        internalNotes: notes.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Caso de moderação atualizado.");
      setSelected(null);
      setNotes("");
      setDecision("");

      queryClient.invalidateQueries({
        queryKey: ["admin-moderation-cases"],
      });

      queryClient.invalidateQueries({
        queryKey: ["admin-overview"],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const assign = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error("Selecione um caso.");
      }

      await assignModerationCase(selected.id, null);
    },
    onSuccess: () => {
      toast.success("Caso desatribuído.");

      queryClient.invalidateQueries({
        queryKey: ["admin-moderation-cases"],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const items = cases.data ?? [];

  function selectCase(item: ModerationCase) {
    setSelected(item);
    setNotes(item.internal_notes ?? "");
    setDecision(item.decision ?? "");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Denúncias</h1>
        <p className="text-sm text-muted-foreground">
          Central administrativa para análise e moderação de denúncias.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Casos de moderação
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:w-64"
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as ModerationStatus | "all",
              )
            }
          >
            <option value="pending">Pendentes</option>
            <option value="under_review">Em análise</option>
            <option value="resolved">Resolvidos</option>
            <option value="dismissed">Descartados</option>
            <option value="all">Todos</option>
          </select>

          {cases.isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Carregando casos…
            </div>
          ) : cases.isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Não foi possível carregar os casos de moderação.
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
              Nenhum caso encontrado.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/40 ${
                    selected?.id === item.id
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                  onClick={() => selectCase(item)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">
                      {reportTypeLabels[item.report_type] ??
                        item.report_type}
                    </div>

                    <Badge>
                      {statusLabels[item.status] ?? item.status}
                    </Badge>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    ID da denúncia: {item.report_id}
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString("pt-BR")}
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
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Detalhes do caso
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">
                  Tipo
                </div>
                <div className="font-medium">
                  {reportTypeLabels[selected.report_type] ??
                    selected.report_type}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Status
                </div>
                <div className="font-medium">
                  {statusLabels[selected.status] ?? selected.status}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  ID da denúncia
                </div>
                <div className="break-all text-sm">
                  {selected.report_id}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Responsável
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  {selected.assigned_display_name ||
                    selected.assigned_username ||
                    "Não atribuído"}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Criado em
                </div>
                <div className="text-sm">
                  {new Date(selected.created_at).toLocaleString("pt-BR")}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Revisado em
                </div>
                <div className="text-sm">
                  {selected.reviewed_at
                    ? new Date(selected.reviewed_at).toLocaleString(
                        "pt-BR",
                      )
                    : "Ainda não revisado"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moderation-decision">
                Decisão
              </Label>

              <select
                id="moderation-decision"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={decision}
                onChange={(event) =>
                  setDecision(
                    event.target.value as ModerationDecision | "",
                  )
                }
              >
                <option value="">Selecione uma decisão</option>

                {Object.entries(decisionLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moderation-notes">
                Notas internas
              </Label>

              <Input
                id="moderation-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Observações internas da equipe"
                maxLength={5000}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={update.isPending}
                onClick={() => update.mutate("under_review")}
              >
                <Flag className="mr-2 h-4 w-4" />
                Em análise
              </Button>

              <Button
                disabled={update.isPending}
                onClick={() => update.mutate("resolved")}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Resolver
              </Button>

              <Button
                variant="secondary"
                disabled={update.isPending}
                onClick={() => update.mutate("dismissed")}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Descartar
              </Button>

              <Button
                variant="ghost"
                disabled={assign.isPending}
                onClick={() => assign.mutate()}
              >
                Desatribuir
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

import * as React from "react";
