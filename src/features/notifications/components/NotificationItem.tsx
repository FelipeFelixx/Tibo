import {
  Bell,
  Heart,
  MessageCircle,
  MessageSquare,
  Radio,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "../api";

const TYPE_META: Record<string, { icon: typeof Bell; tone: string; label: string }> = {
  curtida: { icon: Heart, tone: "bg-rose-500/10 text-rose-500", label: "Curtida" },
  reacao: { icon: Heart, tone: "bg-rose-500/10 text-rose-500", label: "Reação" },
  comentario: { icon: MessageSquare, tone: "bg-sky-500/10 text-sky-500", label: "Comentário" },
  seguidor: { icon: UserPlus, tone: "bg-primary/10 text-primary", label: "Novo seguidor" },
  follow: { icon: UserPlus, tone: "bg-primary/10 text-primary", label: "Novo seguidor" },
  amizade: { icon: Users, tone: "bg-emerald-500/10 text-emerald-600", label: "Amizade" },
  friend_request: { icon: Users, tone: "bg-emerald-500/10 text-emerald-600", label: "Amizade" },
  mensagem: { icon: MessageCircle, tone: "bg-indigo-500/10 text-indigo-500", label: "Mensagem" },
  comunidade: { icon: Users, tone: "bg-amber-500/10 text-amber-600", label: "Comunidade" },
  story: { icon: Sparkles, tone: "bg-fuchsia-500/10 text-fuchsia-500", label: "Story" },
  live: { icon: Radio, tone: "bg-red-500/10 text-red-500", label: "Live" },
};

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function NotificationItem({
  notification,
  onOpen,
}: {
  notification: NotificationRow;
  onOpen?: (n: NotificationRow) => void;
}) {
  const meta = TYPE_META[notification.type] ?? {
    icon: Bell,
    tone: "bg-muted text-muted-foreground",
    label: "Notificação",
  };
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen?.(notification)}
      aria-label={`${meta.label}: ${notification.title}${notification.read ? "" : " (não lida)"}`}
      className={cn(
        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-border p-4 text-left transition-colors active:scale-[0.995]",
        notification.read ? "bg-card hover:bg-muted/50" : "bg-primary/5 hover:bg-primary/10",
      )}
    >
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full", meta.tone)}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {meta.label}
        </span>
        <span className="block text-sm font-medium text-foreground">{notification.title}</span>
        {notification.message ? (
          <span className="mt-0.5 block text-sm text-muted-foreground">{notification.message}</span>
        ) : null}
        <span className="mt-1 block text-xs text-muted-foreground">{timeAgo(notification.created_at)}</span>
      </span>
      {notification.read ? null : (
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-hidden />
      )}
    </button>
  );
}