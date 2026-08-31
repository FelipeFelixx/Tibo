import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/i18n";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Globe, Lock } from "lucide-react";
import { categoriesOptions, communitiesInfiniteOptions } from "@/features/communities/queries";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/explorar")({
  head: () => ({ meta: [{ title: "Explorar · Tibo" }, { name: "robots", content: "noindex" }] }),
  component: ExplorePage,
});

type ExploreUser = {
  id: string;
  username: string;
  nome: string | null;
  sobrenome: string | null;
};

function ExplorePage() {
  const { t } = useI18n();
  const [term, setTerm] = useState("");
  const { data: categories = [] } = useQuery(categoriesOptions());
  const usersQuery = useQuery({
    queryKey: ["explore-users", term],
    queryFn: async () => {
      const q = term.trim().replace(/^@/, "");
      if (!q) return [];
      const db = supabase as unknown as {
        rpc: (
          functionName: string,
          args: Record<string, string>,
        ) => Promise<{ data: ExploreUser[] | null; error: Error | null }>;
      };
      const { data, error } = await db.rpc("search_profiles", { _query: q });
      if (error) throw error;
      return data ?? [];
    },
    enabled: term.trim().length >= 2,
    staleTime: 10_000,
  });
  const { data } = useInfiniteQuery(communitiesInfiniteOptions({ search: term || undefined }));
  const items = data?.pages.flatMap((p) => p.items).slice(0, 12) ?? [];

  return (
    <AppShell title={t("nav.exploreTitle", "Explorar")} showBack={false} maxWidth="lg">
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar pessoas, comunidades, tópicos…"
            className="pl-9"
          />
        </div>

        {usersQuery.data?.length ? (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Pessoas</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {usersQuery.data.map((u) => (
                <Link key={u.id} to="/u/$username" params={{ username: u.username }}>
                  <Card className="transition hover:border-primary/60">
                    <CardContent className="flex items-center gap-3 p-3">
                      <Avatar className="h-10 w-10"><AvatarFallback>{(u.nome || u.username).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{[u.nome, u.sobrenome].filter(Boolean).join(" ") || u.username}</div>
                        <div className="truncate text-sm text-muted-foreground">@{u.username}</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Categorias</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/comunidades"
                search={{ cat: c.slug }}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs transition hover:border-primary/60 hover:text-primary"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Comunidades em alta</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <Link key={c.id} to="/c/$slug" params={{ slug: c.slug }}>
                <Card className="h-full transition hover:border-primary/60 hover:shadow-md">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <h3 className="line-clamp-1 font-semibold">{c.name}</h3>
                      {c.visibility === "privada" ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Globe className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description || "Sem descrição"}</p>
                    <div className="mt-3 flex items-center justify-between">
                      {c.category ? <Badge variant="secondary" className="text-[10px]">{c.category.name}</Badge> : <span />}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{c.member_count}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}