import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Plus, Lock, Globe } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  categoriesOptions,
  communitiesInfiniteOptions,
} from "@/features/communities/queries";

const searchSchema = z.object({
  q: z.string().optional(),
  cat: z.string().optional(),
  mine: z.coerce.boolean().optional(),
});

export const Route = createFileRoute("/comunidades/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Comunidades — Tibo" },
      {
        name: "description",
        content: "Descubra e participe de comunidades no Tibo.",
      },
    ],
  }),
  component: CommunitiesBrowsePage,
});

function CommunitiesBrowsePage() {
  const { q, cat, mine } = Route.useSearch();
  const navigate = useNavigate();
  type S = { q?: string; cat?: string; mine?: boolean };
  const [term, setTerm] = useState(q ?? "");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: categories = [] } = useQuery(categoriesOptions());
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery(
    communitiesInfiniteOptions({ search: q, category: cat, onlyMine: mine }),
  );

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    io.observe(loadMoreRef.current);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/comunidades", search: (prev: S) => ({ ...prev, q: term || undefined }) });
  }

  return (
    <AppShell title="Comunidades" showBack={false} maxWidth="xl">
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Comunidades</h1>
            <p className="text-sm text-muted-foreground">
              Encontre pessoas que curtem o que você curte.
            </p>
          </div>
          <Button asChild>
            <Link to="/comunidades/nova">
              <Plus className="mr-2 h-4 w-4" /> Nova comunidade
            </Link>
          </Button>
        </div>

        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar comunidades"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => navigate({ to: "/comunidades", search: (p: S) => ({ ...p, cat: undefined }) })}
            className={`rounded-full border px-3 py-1 text-xs transition ${!cat ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate({ to: "/comunidades", search: (p: S) => ({ ...p, cat: c.slug }) })}
              className={`rounded-full border px-3 py-1 text-xs transition ${cat === c.slug ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {c.name}
            </button>
          ))}
          <button
            onClick={() => navigate({ to: "/comunidades", search: (p: S) => ({ ...p, mine: p.mine ? undefined : true }) })}
            className={`ml-auto rounded-full border px-3 py-1 text-xs transition ${mine ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            Minhas
          </button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma comunidade encontrada.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <Link
                key={c.id}
                to="/c/$slug"
                params={{ slug: c.slug }}
                className="group block"
              >
                <Card className="h-full transition hover:border-primary/60 hover:shadow-md">
                  <div className="h-20 rounded-t-lg bg-gradient-to-br from-primary/40 to-accent/40" />
                  <CardContent className="pt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="line-clamp-1 font-semibold group-hover:text-primary">
                        {c.name}
                      </h3>
                      {c.visibility === "privada" ? (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                      {c.description || "Sem descrição"}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      {c.category ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {c.category.name}
                        </Badge>
                      ) : <span />}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {c.member_count}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div ref={loadMoreRef} className="h-8" />
        {isFetchingNextPage && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Carregando mais…
          </div>
        )}
      </div>
    </AppShell>
  );
}