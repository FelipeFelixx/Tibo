import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SignedImage } from "@/features/profile/components/SignedImage";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";
import { getOrCreateDirectConversation, searchChatCandidates, type SearchableUser } from "../api";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

export function NewChatDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const h = window.setTimeout(() => {
      searchChatCandidates(term).then(setResults).catch(() => setResults([])).finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(h);
  }, [term, open]);

  async function start(u: SearchableUser) {
    try {
      setStarting(u.id);
      const cid = await getOrCreateDirectConversation(u.id);
      onOpenChange(false);
      navigate({ to: "/mensagens/$id", params: { id: cid } });
    } catch (e) { toast.error((e as Error).message); }
    finally { setStarting(null); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova conversa</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar amigos ou seguidores…" className="pl-9" autoFocus />
        </div>
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {loading && <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>}
          {!loading && results.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</p>}
          {results.map((u) => {
            const name = [u.nome, u.sobrenome].filter(Boolean).join(" ") || u.username;
            return (
              <button key={u.id} onClick={() => start(u)} disabled={starting === u.id} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted disabled:opacity-50">
                <Avatar className="h-10 w-10"><SignedAvatarImage bucket="avatars" path={u.avatar_url} alt={u.username} className="h-full w-full object-cover" /><AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{name}</div><div className="truncate text-xs text-muted-foreground">@{u.username}</div></div>
                {starting === u.id && <Loader2 className="h-4 w-4 animate-spin" />}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
