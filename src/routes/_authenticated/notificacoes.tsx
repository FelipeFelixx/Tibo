import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/state";
import { NotificationItem } from "@/features/notifications/components/NotificationItem";
import { markAllNotificationsRead, markNotificationRead } from "@/features/notifications/api";
import { notificationKeys, notificationsOptions } from "@/features/notifications/queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações · Tibo" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery(notificationsOptions());

  useEffect(() => {
    const ch = supabase
      .channel("notifications-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        qc.invalidateQueries({ queryKey: notificationKeys.all });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success("Todas marcadas como lidas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unread = (data ?? []).filter((n) => !n.read).length;

  return (
    <AppShell
      title={t("nav.notificationsTitle", "Notificações")}
      actions={
        unread > 0 ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Marcar todas como lidas"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
          >
            <CheckCheck className="h-5 w-5" />
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorState
          title="Não foi possível carregar suas notificações"
          description={(error as Error).message}
          onRetry={() => refetch()}
        />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="Você ainda não possui notificações"
          description="Curtidas, comentários, amizades, mensagens e novidades das comunidades aparecerão aqui."
        />
      ) : (
        <div className="space-y-2">
          {unread > 0 ? (
            <p className="px-1 text-xs font-medium text-muted-foreground">
              {unread} não {unread === 1 ? "lida" : "lidas"}
            </p>
          ) : null}
          {(data ?? []).map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onOpen={(item) => {
                if (item.read) return;
                void markNotificationRead(item.id).then(() =>
                  qc.invalidateQueries({ queryKey: notificationKeys.all }),
                );
              }}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
