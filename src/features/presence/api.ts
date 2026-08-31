import { supabase } from "@/integrations/supabase/client";

export type PresenceStatus = "online" | "away" | "offline";
export type PresenceRow = { user_id: string; status: PresenceStatus; last_seen: string };

export async function upsertMyPresence(status: PresenceStatus = "online") {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return;
  await supabase.from("user_presence").upsert(
    { user_id: uid, status, last_seen: new Date().toISOString(), updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
}

export async function fetchPresenceMany(userIds: string[]): Promise<Record<string, PresenceRow>> {
  if (!userIds.length) return {};
  const { data } = await supabase.from("user_presence").select("user_id,status,last_seen").in("user_id", userIds);
  const map: Record<string, PresenceRow> = {};
  for (const r of (data ?? []) as PresenceRow[]) map[r.user_id] = r;
  return map;
}

/** A user is considered "online" if status='online' AND heartbeat within last 90s. */
export function isOnline(p: PresenceRow | undefined | null): boolean {
  if (!p) return false;
  if (p.status !== "online") return false;
  return Date.now() - new Date(p.last_seen).getTime() < 90_000;
}

export function formatLastSeen(p: PresenceRow | undefined | null): string {
  if (!p) return "Offline";
  if (isOnline(p)) return "Online";
  const diff = Math.max(0, Date.now() - new Date(p.last_seen).getTime());
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Visto agora";
  if (mins < 60) return `Visto há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Visto há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Visto há ${days}d`;
}

/** Starts a heartbeat + tab-visibility integration. Returns a cleanup fn. */
export function startPresenceHeartbeat(): () => void {
  let stopped = false;
  const beat = () => {
    if (stopped) return;
    const status: PresenceStatus = document.visibilityState === "visible" ? "online" : "away";
    void upsertMyPresence(status);
  };
  beat();
  const interval = window.setInterval(beat, 30_000);
  const onVis = () => beat();
  const onUnload = () => { void upsertMyPresence("offline"); };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("beforeunload", onUnload);
  return () => {
    stopped = true;
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("beforeunload", onUnload);
    void upsertMyPresence("offline");
  };
}