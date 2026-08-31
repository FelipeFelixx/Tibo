import { useEffect, useState } from "react";
import { Award, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getBadgeImageUrl, setMyBadgeVisibility, type UserBadge } from "@/features/admin/platform";
import { supabase } from "@/integrations/supabase/client";

export function ProfileBadges({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const db = supabase;
      const { data, error } = isOwner ? await db.rpc("get_my_badges") : await db.rpc("get_user_badges", { _user_id: userId });
      if (error) throw error;
      const rows = (data ?? []) as UserBadge[];
      setBadges(rows);
      const pairs = await Promise.all(rows.map(async (b) => [b.id, await getBadgeImageUrl(b.image_path)] as const));
      const nextUrls: Record<string, string> = {};
      for (const [id, url] of pairs) if (url) nextUrls[id] = url;
      setUrls(nextUrls);
    } catch (e) { console.warn("[ProfileBadges]", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [userId, isOwner]);
  if (loading || badges.length === 0) return null;

  return <section className="mt-5 flex flex-col items-center text-center">
    <div className="mb-2 flex items-center justify-center gap-2"><Award className="h-4 w-4 text-primary" /><h2 className="font-semibold">Emblemas</h2></div>
    <div className="flex w-full flex-wrap justify-center gap-2">
      {badges.map((b) => <div key={b.id} title={`${b.name}${b.level > 1 ? ` · Nível ${b.level}` : ""}`} className={`group relative rounded-2xl border bg-card p-2 ${b.is_visible ? "" : "opacity-50"}`}>
        {urls[b.id] ? <img src={urls[b.id]} alt={b.name} className="block h-14 w-14 object-contain object-center mx-auto" /> : <div className="grid h-14 w-14 place-items-center text-xs text-muted-foreground">{b.name.slice(0, 2)}</div>}
        <div className="max-w-20 truncate text-center text-[10px] text-muted-foreground">{b.name}</div>
        {isOwner && <Button type="button" variant="ghost" size="icon" className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-background" aria-label={b.is_visible ? "Ocultar emblema" : "Mostrar emblema"} onClick={async () => { try { await setMyBadgeVisibility(b.id, !b.is_visible, b.display_order); await load(); } catch (e) { toast.error((e as Error).message); } }}>{b.is_visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</Button>}
      </div>)}
    </div>
    {isOwner && <p className="mt-2 text-xs text-muted-foreground">Escolha quais emblemas ficam visíveis no seu perfil.</p>}
  </section>;
}
