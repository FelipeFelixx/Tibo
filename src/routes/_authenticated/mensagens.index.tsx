import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { conversationsOptions } from "@/features/messages/queries";
import { deleteConversation, leaveConversation } from "@/features/messages/api";
import { fetchPresenceMany, isOnline, startPresenceHeartbeat, type PresenceRow } from "@/features/presence/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignedImage } from "@/features/profile/components/SignedImage";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MessageCircle, Plus, MoreVertical, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NewChatDialog } from "@/features/messages/components/NewChatDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mensagens/")({
  head: () => ({ meta: [{ title: "Mensagens · Tibo" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(conversationsOptions()),
  component: MessagesPage,
});

function MessagesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: convs = [] } = useQuery(conversationsOptions());
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceRow>>({});
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setViewerId(data.session?.user.id ?? null)); }, []);
  useEffect(() => startPresenceHeartbeat(), []);

  useEffect(() => {
    const ids = convs.map((c) => c.other.id);
    if (ids.length) fetchPresenceMany(ids).then(setPresenceMap);
  }, [convs]);

  useEffect(() => {
    const channel = supabase.channel("mensagens-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
        qc.invalidateQueries({ queryKey: ["messages", "unread-total"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" },
        (p) => { const r = (p.new ?? p.old) as PresenceRow; if (r?.user_id) setPresenceMap((m) => ({ ...m, [r.user_id]: r })); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    const sorted = [...convs].sort((a, b) => {
      const oa = isOnline(presenceMap[a.other.id]) ? 1 : 0;
      const ob = isOnline(presenceMap[b.other.id]) ? 1 : 0;
      if (oa !== ob) return ob - oa;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
    if (!t) return sorted;
    return sorted.filter((c) => {
      const name = (c.other.nome || c.other.username).toLowerCase();
      return name.includes(t) || c.other.username.toLowerCase().includes(t);
    });
  }, [convs, term, presenceMap]);

  async function onLeave(id: string) {
    if (!confirm("Sair desta conversa?")) return;
    try { await leaveConversation(id); qc.invalidateQueries({ queryKey: ["conversations"] }); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function onDelete(id: string) {
    if (!confirm("Excluir esta conversa para todos?")) return;
    try { await deleteConversation(id); qc.invalidateQueries({ queryKey: ["conversations"] }); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <AppShell title="Mensagens" actions={<Button size="icon" onClick={() => setOpen(true)} aria-label="Nova conversa"><Plus className="h-5 w-5" /></Button>}>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Pesquisar conversas…" className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          <MessageCircle className="mx-auto h-10 w-10" />
          <p className="mt-3 font-medium text-foreground">Nenhuma conversa ainda</p>
          <p className="text-sm">Toque em + para iniciar uma nova conversa.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const name = c.other.nome || `@${c.other.username}`;
            const preview = c.last_message?.content ?? (c.last_message?.image_url ? "📷 Imagem" : "Sem mensagens ainda");
            const online = isOnline(presenceMap[c.other.id]);
            const canDeleteAll = viewerId && (c.is_group ? c.created_by === viewerId : true);
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/40">
                <button onClick={() => navigate({ to: "/mensagens/$id", params: { id: c.id } })} className="flex flex-1 items-center gap-3 text-left">
                  <div className="relative">
                    <Avatar className="h-11 w-11">
                      <SignedAvatarImage bucket="avatars" path={c.other.avatar_url} alt={c.other.username} className="h-full w-full object-cover" />
                      <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{name}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {new Date(c.last_message_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">{preview}</p>
                      {c.unread > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{c.unread}</span>
                      )}
                    </div>
                  </div>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onLeave(c.id)}>Sair da conversa</DropdownMenuItem>
                    {canDeleteAll && <DropdownMenuItem className="text-destructive" onClick={() => onDelete(c.id)}>Excluir para todos</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      <NewChatDialog open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}
