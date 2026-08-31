import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LifeBuoy, Paperclip, Send } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createSupportTicket } from "@/features/support/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TiboLogo } from "@/components/brand/tibo-logo";

export const Route = createFileRoute("/help/chamados/novo")({
  head: () => ({
    meta: [
      { title: "Novo chamado — Central de Ajuda Tibo" },
      {
        name: "description",
        content:
          "Entre em contato com o suporte do Tibo por meio de um chamado.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: NewSupportTicketPage,
});

const categories = [
  { value: "conta", label: "Conta e acesso" },
  { value: "seguranca", label: "Segurança ou conta comprometida" },
  { value: "denuncia", label: "Denúncia ou moderação" },
  { value: "mensagens", label: "Mensagens" },
  { value: "publicacao", label: "Publicações" },
  { value: "comunidade", label: "Comunidades" },
  { value: "business", label: "Tibo Business" },
  { value: "ads", label: "Tibo Ads" },
  { value: "shop", label: "Tibo Shop" },
  { value: "outro", label: "Outro assunto" },
];

function NewSupportTicketPage() {
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit =
    category.trim() !== "" &&
    subject.trim().length >= 3 &&
    description.trim().length >= 10;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const categoryMap: Record<string, string> = {
        conta: "account",
        seguranca: "security",
        denuncia: "reports",
        mensagens: "technical",
        publicacao: "technical",
        comunidade: "technical",
        business: "business",
        ads: "ads",
        shop: "shop",
        outro: "other",
      };

      const { data, error } = await supabase.rpc("create_support_ticket", {
        _category: categoryMap[category] ?? "general",
        _subject: subject.trim(),
        _description: description.trim(),
        _priority: "normal",
      });

      if (error) throw error;

      if (!data) {
        throw new Error("O chamado não foi criado.");
      }

      setMessage("Chamado enviado com sucesso.");

      setCategory("");
      setSubject("");
      setDescription("");
      setFile(null);
    } catch (error) {
      console.error("[SupportTicket] erro ao criar chamado:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o chamado.",
      );
    } finally {
      setSubmitting(false);
    }
  }

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
          to="/help/chamados"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Meus chamados
        </Link>

        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
              <LifeBuoy className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Abrir chamado
              </h1>
              <p className="text-sm text-muted-foreground">
                Explique o que aconteceu para que nossa equipe possa ajudar.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes da solicitação</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="support-category">Categoria</Label>

                <select
                  id="support-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={submitting}
                >
                  <option value="">Selecione uma categoria</option>

                  {categories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-subject">Assunto</Label>

                <Input
                  id="support-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Ex.: Não consigo acessar minha conta"
                  maxLength={120}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-description">Descrição</Label>

                <Textarea
                  id="support-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Conte com detalhes o que aconteceu..."
                  rows={8}
                  maxLength={5000}
                  disabled={submitting}
                />

                <div className="text-right text-xs text-muted-foreground">
                  {description.length}/5000
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-file">Anexo</Label>

                <label
                  htmlFor="support-file"
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border p-4 transition-colors hover:border-primary/50 hover:bg-muted/30"
                >
                  <Paperclip className="h-5 w-5 text-muted-foreground" />

                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {file ? file.name : "Adicionar evidência"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Capturas de tela ou outros arquivos relevantes.
                    </p>
                  </div>

                  <input
                    id="support-file"
                    type="file"
                    className="sr-only"
                    disabled={submitting}
                    onChange={(event) =>
                      setFile(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-sm font-medium">Proteja sua conta</p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Nunca informe sua senha, código de autenticação,
                  código de recuperação ou chave secreta em um chamado.
                  Nossa equipe nunca deve solicitar esses dados.
                </p>
              </div>

              {message ? (
                <div className="rounded-xl border bg-muted/30 p-4 text-sm">
                  {message}
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmit || submitting}
              >
                <Send className="mr-2 h-4 w-4" />
                {submitting ? "Enviando…" : "Enviar chamado"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

