import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { followUser, unfollowUser } from "@/features/profile/api";
import { toast } from "sonner";

export function FollowButton({ targetId }: { targetId: string }) {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id ?? null;
      setViewerId(uid);
      if (uid && uid !== targetId) {
        const { data: row } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", uid)
          .eq("following_id", targetId)
          .maybeSingle();
        setIsFollowing(!!row);
      }
    });
  }, [targetId]);

  if (!viewerId || viewerId === targetId || isFollowing === null) return null;
  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "secondary"}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          if (isFollowing) { await unfollowUser(targetId); setIsFollowing(false); }
          else { await followUser(targetId); setIsFollowing(true); }
        } catch (e) { toast.error((e as Error).message); }
        finally { setBusy(false); }
      }}
    >
      {isFollowing ? "Seguindo" : "Seguir"}
    </Button>
  );
}