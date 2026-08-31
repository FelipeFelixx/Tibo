import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { TiboLogo } from "@/components/brand/tibo-logo";

type RelatedArticle = {
  title: string;
  path: string;
};

export function HelpArticle({
  title,
  children,
  relatedArticles = [],
}: {
  title: string;
  children: ReactNode;
  relatedArticles?: RelatedArticle[];
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <TiboLogo />

        <Link
          to="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Voltar ao Tibo
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

        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold sm:text-4xl">
            {title}
          </h1>

          <div className="mt-6 space-y-5 text-sm leading-7 text-muted-foreground">
            {children}
          </div>
        </article>

        {relatedArticles.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">
              Artigos relacionados
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {relatedArticles.map((article) => (
                <Link
                  key={article.path}
                  to={article.path}
                  className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <span className="text-sm font-medium">
                    {article.title}
                  </span>

                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
