import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LifeBuoy, Plus, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listMySupportTickets, type SupportTicket } from "@/features/support/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TiboLogo } from "@/components/brand/tibo-logo";

export const Route = createFileRoute("/help/chamados")({
  head: () => ({
    meta: [
      { title: "Meus chamados — Central de Ajuda Tibo" },
      {
        name: "description",
        content:
          "Acompanhe seus chamados e converse com o suporte do Tibo.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: SupportTicketsPage,
});

function SupportTicketsPage() {
  const tickets = useQuery({
    queryKey: ["my-support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "list_my_support_tickets",
      );

      if (error) throw error;

      return data ?? [];
    },
  });

  const statusLabels: Record<string, string> = {
    open: "Aberto",
    in_progress: "Em atendimento",
    waiting_user: "Aguardando você",
    resolved: "Resolvido",
    closed: "Encerrado",
  };

  const statusClasses: Record<string, string> = {
    open: "bg-primary/10 text-primary",
    in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    waiting_user: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    resolved: "bg-green-500/10 text-green-600 dark:text-green-400",
    closed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <TiboLogo />

        <Link
          to="/help"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Central de Ajuda
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20">
        <Link
          to="/help"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Central de Ajuda
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">
              Meus chamados
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acompanhe suas solicitações e respostas do suporte.
            </p>
          </div>

          <Button asChild>
            <Link to="/help/chamados/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo chamado
            </Link>
          </Button>
        </div>

        {tickets.isLoading ? (
          <Card className="mt-8">
            <CardContent className="py-14 text-center text-sm text-muted-foreground">
              Carregando seus chamados…
            </CardContent>
          </Card>
        ) : tickets.isError ? (
          <Card className="mt-8">
            <CardContent className="py-14 text-center">
              <LifeBuoy className="mx-auto h-8 w-8 text-destructive" />
              <h2 className="mt-4 font-semibold">
                Não foi possível carregar seus chamados
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Tente novamente em alguns instantes.
              </p>
            </CardContent>
          </Card>
        ) : tickets.data?.length ? (
          <div className="mt-8 space-y-3">
            {tickets.data.map((ticket) => (
              <Card key={ticket.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-semibold">
                        {ticket.subject}
                      </h2>

                      <p className="mt-1 text-xs text-muted-foreground">
                        #{ticket.id.slice(0, 8)} ·{" "}
                        {new Date(ticket.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        statusClasses[ticket.status] ??
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {statusLabels[ticket.status] ?? ticket.status}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {ticket.description}
                  </p>

                  {ticket.resolution ? (
                    <div className="mt-3 rounded-lg bg-muted/40 p-3">
                      <p className="text-xs font-medium">
                        Resolução
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {ticket.resolution}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Categoria: {ticket.category}
                    </span>

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10">
                <LifeBuoy className="h-7 w-7 text-primary" />
              </div>

              <h2 className="mt-5 text-lg font-semibold">
                Você ainda não possui chamados
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Quando você entrar em contato com o suporte, suas
                solicitações aparecerão aqui para que possa acompanhar
                todo o atendimento.
              </p>

              <Button asChild className="mt-6">
                <Link to="/help/chamados/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Abrir chamado
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium">
            Como funciona o atendimento?
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Cada solicitação possui um identificador próprio e pode
            ser acompanhada por você. As respostas e decisões do
            suporte ficam vinculadas ao chamado correspondente.
          </p>
        </div>
      </main>
    </div>
  );
}

