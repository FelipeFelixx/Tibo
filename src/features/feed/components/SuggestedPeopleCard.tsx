import { useQuery } from "@tanstack/react-query";
import { UserPlus, BadgeCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { followUser } from "@/features/profile/api";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

type SuggestedUser = {
  id: string;
  username: string;
  nome?: string | null;
  sobrenome?: string | null;
  verificado?: boolean | null;
};

export function SuggestedPeopleCard() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: users = [] } = useQuery({
    queryKey: ["suggested-people"],
    queryFn: async () => {
      const db = supabase;
      const { data, error } = await db.rpc("suggested_profiles", { _limit: 6 });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  if (!users.length) return null;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3"><CardTitle className="text-base">{t("common.suggestedPeople", "Pessoas sugeridas")}</CardTitle></CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {users.map((u: SuggestedUser) => {
          const name = [u.nome, u.sobrenome].filter(Boolean).join(" ") || u.username;
          return (
            <div key={u.id} className="flex items-center gap-3 rounded-xl border p-3">
              <Link to="/u/$username" params={{ username: u.username }} className="shrink-0">
                <Avatar className="h-10 w-10"><AvatarFallback>{name.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <Link to="/u/$username" params={{ username: u.username }} className="flex min-w-0 items-center gap-1 font-medium hover:underline">
                  <span className="truncate">{name}</span>{u.verificado ? <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                </Link>
                <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={async () => { try { await followUser(u.id); qc.invalidateQueries({ queryKey: ["suggested-people"] }); toast.success(t("common.nowFollowing", `Agora você segue @${u.username}`)); } catch (e) { toast.error(e instanceof Error ? e.message : t("common.followFailed", "Não foi possível seguir.")); } }}>
                <UserPlus className="mr-1.5 h-4 w-4" />{t("common.follow", "Seguir")}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
