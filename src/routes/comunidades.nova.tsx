import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { categoriesOptions } from "@/features/communities/queries";
import { createCommunity, slugify } from "@/features/communities/api";
import type { CommunityInsert } from "@/features/communities/types";
import { communityFormSchema } from "@/features/communities/schema";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/comunidades/nova")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }

    return { user: data.user };
  },
  head: () => ({
    meta: [{ title: "Nova comunidade — Tibo" }, { name: "robots", content: "noindex" }],
  }),
  component: NewCommunityPage,
});

function NewCommunityPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const { data: categories = [] } = useQuery(categoriesOptions());
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [visibility, setVisibility] = useState<"publica" | "privada">("publica");

  const mutation = useMutation({
    mutationFn: (input: CommunityInsert) => createCommunity(input, user.id),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["community"] });
      toast.success("Comunidade criada!");
      navigate({ to: "/c/$slug", params: { slug: c.slug } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = communityFormSchema.safeParse({
      name,
      slug,
      description,
      rules,
      category_id: categoryId || null,
      visibility,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    mutation.mutate({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      rules: parsed.data.rules || null,
      category_id: parsed.data.category_id ?? null,
      visibility: parsed.data.visibility,
      owner_id: user.id,
    });
  }

  return (
    <AppShell title="Nova comunidade" maxWidth="md">
      <Card>
          <CardHeader>
            <CardTitle>Criar comunidade</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="c-name">Nome</Label>
                <Input
                  id="c-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) setSlug(slugify(e.target.value));
                  }}
                  maxLength={60}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-slug">URL (@tibo.com/c/…)</Label>
                <Input
                  id="c-slug"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-desc">Descrição</Label>
                <Textarea
                  id="c-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-rules">Regras</Label>
                <Textarea
                  id="c-rules"
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  maxLength={5000}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={`rounded-full border px-3 py-1 text-xs ${categoryId === c.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Visibilidade</Label>
                <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as "publica" | "privada")}>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="v-pub" value="publica" />
                    <Label htmlFor="v-pub" className="font-normal">Pública — qualquer um pode entrar</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="v-priv" value="privada" />
                    <Label htmlFor="v-priv" className="font-normal">Privada — entrada por solicitação</Label>
                  </div>
                </RadioGroup>
              </div>
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? "Criando…" : "Criar comunidade"}
              </Button>
            </form>
          </CardContent>
        </Card>
    </AppShell>
  );
}