import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import {
  deleteConversation, deleteMessageForEveryone, fetchConversationMeta, fetchMessages,
  hideMessageForMe, leaveConversation, markConversationRead, sendMessage, uploadChatImage,
  type MessageRow,
} from "@/features/messages/api";
import { fetchPresenceMany, isOnline, formatLastSeen, type PresenceRow } from "@/features/presence/api";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SignedImage } from "@/features/profile/components/SignedImage";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Send, Image as ImageIcon, Smile, MoreVertical, Reply, X, Check, CheckCheck, Trash2 } from "lucide-react";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";

export const Route = createFileRoute("/_authenticated/mensagens/$id")({
  head: () => ({ meta: [{ title: "Conversa · Tibo" }, { name: "robots", content: "noindex" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [presence, setPresence] = useState<PresenceRow | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingSentAt = useRef(0);
  const typingClearTimer = useRef<number | null>(null);

  const metaQ = useQuery({ queryKey: ["conv-meta", id], queryFn: () => fetchConversationMeta(id) });
  const msgsQ = useQuery({ queryKey: ["conv-msgs", id], queryFn: () => fetchMessages(id) });

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setViewerId(data.session?.user.id ?? null)); }, []);
  useEffect(() => { if (msgsQ.data) setMessages(msgsQ.data); }, [msgsQ.data]);
  useEffect(() => { markConversationRead(id).then(() => qc.invalidateQueries({ queryKey: ["messages", "unread-total"] })); }, [id, messages.length, qc]);

  const other = metaQ.data?.other;
  const conv = metaQ.data?.conv;

  useEffect(() => {
    if (!other?.id) return;
    fetchPresenceMany([other.id]).then((m) => setPresence(m[other.id] ?? null));
    const ch = supabase
      .channel(`presence-${other.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence", filter: `user_id=eq.${other.id}` },
        (payload) => setPresence(payload.new as PresenceRow))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [other?.id]);

  useEffect(() => {
    const channel = supabase.channel(`conv-${id}`, { config: { broadcast: { self: false } } })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => (prev.some((m) => m.id === (payload.new as MessageRow).id) ? prev : [...prev, payload.new as MessageRow]));
          qc.invalidateQueries({ queryKey: ["conversations"] });
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => setMessages((prev) => prev.map((m) => m.id === (payload.new as MessageRow).id ? (payload.new as MessageRow) : m)))
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => setMessages((prev) => prev.filter((m) => m.id !== (payload.old as { id: string }).id)))
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.user_id && payload.user_id !== viewerId) {
          setOtherTyping(true);
          if (typingClearTimer.current) window.clearTimeout(typingClearTimer.current);
          typingClearTimer.current = window.setTimeout(() => setOtherTyping(false), 3000);
        }
      })
      .subscribe();
    typingChanRef.current = channel;
    return () => { supabase.removeChannel(channel); typingChanRef.current = null; };
  }, [id, qc, viewerId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages, otherTyping]);

  useEffect(() => {
    if (!viewerId || !messages.length) return;
    const unread = messages.filter((m) => m.sender_id !== viewerId && !m.read_at).map((m) => m.id);
    if (!unread.length) return;
    void supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread);
  }, [messages, viewerId]);

  function sendTyping() {
    const now = Date.now();
    if (now - typingSentAt.current < 1500) return;
    typingSentAt.current = now;
    typingChanRef.current?.send({ type: "broadcast", event: "typing", payload: { user_id: viewerId } });
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(id, { content: text, reply_to: replyTo?.id ?? null });
      setText(""); setReplyTo(null);
    } catch (err) { toast.error((err as Error).message); }
    finally { setSending(false); }
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setSending(true);
      const path = await uploadChatImage(file);
      await sendMessage(id, { image_url: path, reply_to: replyTo?.id ?? null });
      setReplyTo(null);
    } catch (err) { toast.error((err as Error).message); }
    finally { setSending(false); }
  }

  const messageMap = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const onlineDot = isOnline(presence);

  const title = other ? (
    <Link to="/u/$username" params={{ username: other.username }} className="flex items-center gap-2">
      <div className="relative">
        <Avatar className="h-8 w-8">
          <SignedAvatarImage bucket="avatars" path={other.avatar_url} alt={other.username} className="h-full w-full object-cover" />
          <AvatarFallback>{(other.nome ?? other.username)[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        {onlineDot && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="truncate text-sm">{[other.nome, other.sobrenome].filter(Boolean).join(" ") || `@${other.username}`}</span>
        <span className="text-[10px] text-muted-foreground">{otherTyping ? "digitando…" : formatLastSeen(presence)}</span>
      </div>
    </Link>
  ) : "Conversa";

  async function onLeave() {
    if (!confirm("Sair da conversa?")) return;
    try { await leaveConversation(id); toast.success("Você saiu"); navigate({ to: "/mensagens" }); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function onDelete() {
    if (!confirm("Excluir conversa para todos?")) return;
    try { await deleteConversation(id); toast.success("Excluída"); navigate({ to: "/mensagens" }); }
    catch (e) { toast.error((e as Error).message); }
  }

  const canDeleteAll = viewerId && conv && (conv.is_group ? conv.created_by === viewerId : true);

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onLeave}>Sair da conversa</DropdownMenuItem>
        {canDeleteAll && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={onDelete}>Excluir para todos</DropdownMenuItem></>}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <AppShell
      title={title}
      maxWidth="lg"
      hideBottomNav
      contentClassName="flex flex-col h-[calc(100dvh-4rem)] px-0 sm:px-0 pt-0 sm:pt-0"
      actions={menu}
    >
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
        {messages.map((m) => {
          const mine = m.sender_id === viewerId;
          const parent = m.reply_to ? messageMap.get(m.reply_to) : null;
          return (
            <div key={m.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {parent && (
                  <div className={`mb-1 rounded-md border-l-2 px-2 py-1 text-[11px] ${mine ? "border-primary-foreground/50 bg-primary-foreground/10" : "border-primary/50 bg-background/60"}`}>
                    {parent.content ?? "📷 Imagem"}
                  </div>
                )}
                {m.image_url && (
                  <div className="mb-1 overflow-hidden rounded-lg">
                    <SignedImage bucket="chat-media" path={m.image_url} alt="Imagem" className="max-h-80 w-full object-cover" />
                  </div>
                )}
                {m.content && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
                <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "opacity-80" : "text-muted-foreground"}`}>
                  <span>{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  {mine && (m.read_at ? <CheckCheck className="h-3 w-3 text-sky-300" /> : <Check className="h-3 w-3" />)}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 self-center opacity-0 transition-opacity group-hover:opacity-100" aria-label="Mais"><MoreVertical className="h-4 w-4 text-muted-foreground" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={mine ? "end" : "start"}>
                  <DropdownMenuItem onClick={() => setReplyTo(m)}><Reply className="mr-2 h-4 w-4" />Responder</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => hideMessageForMe(m.id).then(() => setMessages((p) => p.filter((x) => x.id !== m.id)))}>
                    <Trash2 className="mr-2 h-4 w-4" />Apagar para mim
                  </DropdownMenuItem>
                  {mine && <DropdownMenuItem className="text-destructive" onClick={() => deleteMessageForEveryone(m.id)}><Trash2 className="mr-2 h-4 w-4" />Apagar para todos</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
        {messages.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">Envie a primeira mensagem 👋</p>}
        {otherTyping && <div className="text-xs text-muted-foreground">digitando…</div>}
      </div>

      {replyTo && (
        <div className="flex items-center gap-2 border-t bg-muted/50 px-4 py-2 text-xs">
          <Reply className="h-3.5 w-3.5" />
          <span className="flex-1 truncate">Respondendo: {replyTo.content ?? "📷 Imagem"}</span>
          <button onClick={() => setReplyTo(null)} aria-label="Cancelar"><X className="h-4 w-4" /></button>
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="sticky bottom-0 flex items-center gap-1.5 border-t border-border bg-background px-2 py-2 sm:gap-2 sm:px-3 sm:py-3"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImage} />
        <Button type="button" size="icon" variant="ghost" className="min-h-10 min-w-10 shrink-0" onClick={() => fileRef.current?.click()} aria-label="Enviar imagem"><ImageIcon className="h-5 w-5" /></Button>
        <Popover>
          <PopoverTrigger asChild><Button type="button" size="icon" variant="ghost" className="min-h-10 min-w-10 shrink-0" aria-label="Emojis"><Smile className="h-5 w-5" /></Button></PopoverTrigger>
          <PopoverContent className="w-auto border-0 p-0" side="top" align="start">
            <EmojiPicker theme={Theme.AUTO} emojiStyle={EmojiStyle.NATIVE} onEmojiClick={(e) => setText((t) => t + e.emoji)} />
          </PopoverContent>
        </Popover>
        <Input
          value={text}
          onChange={(e) => { setText(e.target.value); sendTyping(); }}
          placeholder="Escreva uma mensagem…"
          aria-label="Mensagem"
          className="min-h-10 min-w-0 flex-1 rounded-full"
        />
        <Button type="submit" size="icon" className="min-h-10 min-w-10 shrink-0 rounded-full" disabled={sending || !text.trim()} aria-label="Enviar mensagem"><Send className="h-4 w-4" /></Button>
      </form>
    </AppShell>
  );
}