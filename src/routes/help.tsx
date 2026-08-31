import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useI18n } from "@/i18n";
import { HelpCategoryCard } from "@/features/help/components/HelpCategoryCard";
import { helpCategories } from "@/features/help/data/help-categories";
import { Input } from "@/components/ui/input";
import { TiboLogo } from "@/components/brand/tibo-logo";

export const Route = createFileRoute("/help")({
  component: HelpPage,
  head: () => ({
    meta: [
      { title: "Central de Ajuda — Tibo" },
      {
        name: "description",
        content:
          "Encontre respostas sobre sua conta, segurança, publicações, mensagens, comunidades, Tibo Business, Tibo Ads e Tibo Shop.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function HelpPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");

  const filteredCategories = helpCategories.filter((category) => {
    const value = search.toLowerCase().trim();

    if (!value) return true;

    return (
      category.title.toLowerCase().includes(value) ||
      category.description.toLowerCase().includes(value)
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <TiboLogo />
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold sm:text-5xl">
            {t("help.title", "Central de Ajuda")}
          </h1>

          <p className="mt-4 text-muted-foreground">
            {t(
              "help.subtitle",
              "Encontre respostas sobre conta, segurança, comunidades, anúncios e recursos do Tibo.",
            )}
          </p>

          <div className="relative mt-8">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

            <Input
              className="h-12 pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                "help.search",
                "Como podemos ajudar?",
              )}
            />
          </div>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {filteredCategories.map((category) => (
            <HelpCategoryCard
              key={category.id}
              category={category}
            />
          ))}

          {filteredCategories.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground">
              {t(
                "help.noResults",
                "Nenhuma categoria encontrada.",
              )}
            </p>
          )}
        </section>

        <section className="mx-auto mt-16 max-w-4xl">
          <h2 className="text-2xl font-bold">
            {t("help.faqTitle", "Perguntas frequentes")}
          </h2>

          <div className="mt-6 grid gap-3">
            <details className="rounded-xl border border-border bg-card p-4">
              <summary className="cursor-pointer font-medium">
                {t(
                  "help.faqAccount",
                  "Como criar uma conta no Tibo?",
                )}
              </summary>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Você pode criar sua conta pelo fluxo de cadastro
                do Tibo, fornecendo as informações solicitadas e
                confirmando seu endereço de e-mail quando necessário.
              </p>
            </details>

            <details className="rounded-xl border border-border bg-card p-4">
              <summary className="cursor-pointer font-medium">
                {t(
                  "help.faqSecurity",
                  "Como proteger minha conta?",
                )}
              </summary>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Use uma senha forte, mantenha seu e-mail seguro e
                nunca compartilhe suas credenciais. O Tibo também
                disponibiliza ferramentas de segurança e denúncia.
              </p>
            </details>

            <details className="rounded-xl border border-border bg-card p-4">
              <summary className="cursor-pointer font-medium">
                {t(
                  "help.faqReport",
                  "Como denunciar um conteúdo?",
                )}
              </summary>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Utilize as ferramentas de denúncia disponíveis no
                conteúdo ou perfil. As denúncias podem ser analisadas
                de acordo com as regras e políticas do Tibo.
              </p>
            </details>

            <details className="rounded-xl border border-border bg-card p-4">
              <summary className="cursor-pointer font-medium">
                {t(
                  "help.faqBusinessAds",
                  "Qual a diferença entre Tibo Business e Tibo Ads?",
                )}
              </summary>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                O Tibo Business reúne ferramentas para presença e
                gestão comercial. O Tibo Ads é destinado à criação
                e gerenciamento de publicidade paga dentro da
                plataforma.
              </p>
            </details>

            <details className="rounded-xl border border-border bg-card p-4">
              <summary className="cursor-pointer font-medium">
                {t(
                  "help.faqPrivacy",
                  "Como funciona a privacidade no Tibo?",
                )}
              </summary>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                O Tibo possui recursos de privacidade, controle de
                acesso, denúncias e proteção de contas. Consulte
                também a Política de Privacidade para informações
                detalhadas.
              </p>
            </details>
          </div>
        </section>
      </main>
    </div>
  );
}
