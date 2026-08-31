import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getActiveAds, trackAdEvent } from "../api";
import { signedImageOptions } from "@/features/profile/queries";
import { useQuery as useRQ } from "@tanstack/react-query";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";

export function SponsoredStoryCard() {
  const { data: ads = [] } = useQuery({ queryKey: ["tibo-ads", "active", "story"], queryFn: () => getActiveAds(1), staleTime: 60_000 });
  const ad = ads[0];
  const tracked = useRef(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (ad && !tracked.current) { tracked.current = true; void trackAdEvent(ad.creative_id, "impression"); } }, [ad]);
  if (!ad) return null;
  const initials = ad.business_name.slice(0,2).toUpperCase();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="relative flex h-[92px] w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-primary/30 bg-card p-1.5 text-left shadow-sm transition hover:border-primary/60 active:scale-95">
        <span className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-primary/60 bg-muted">
          {ad.image_path ? <AdThumb path={ad.image_path} /> : <span className="grid h-full w-full place-items-center"><Avatar className="h-full w-full"><SignedAvatarImage bucket="business-ads" path={ad.business_avatar_path} alt={ad.business_name} className="h-full w-full object-contain" /><AvatarFallback>{initials}</AvatarFallback></Avatar></span>}
          <span className="absolute bottom-0 right-0 rounded-full bg-primary p-1 text-primary-foreground"><Megaphone className="h-2.5 w-2.5" /></span>
        </span>
        <span className="max-w-full truncate text-[10px] font-medium">Patrocinado</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" />Publicidade no Tibo</DialogTitle>
          <div className="space-y-3">
            <div className="flex items-center gap-3"><Avatar className="h-10 w-10"><SignedAvatarImage bucket="business-ads" path={ad.business_avatar_path} alt={ad.business_name} className="h-full w-full object-contain" /><AvatarFallback>{initials}</AvatarFallback></Avatar><div><p className="font-semibold">{ad.business_name}</p><Badge variant="secondary" className="text-[10px]">Patrocinado</Badge></div></div>
            {ad.image_path ? <AdImage path={ad.image_path} /> : null}
            {ad.video_path ? <AdVideo path={ad.video_path} /> : null}
            <div><h3 className="font-semibold">{ad.headline}</h3>{ad.body ? <p className="mt-1 text-sm text-muted-foreground">{ad.body}</p> : null}</div>
            {ad.destination_url ? <Button asChild onClick={() => void trackAdEvent(ad.creative_id, "click")}><a href={ad.destination_url} target="_blank" rel="noopener noreferrer nofollow">{ad.cta_label}<ExternalLink className="ml-2 h-4 w-4" /></a></Button> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AdThumb({ path }: { path: string }) { const { data:url } = useRQ(signedImageOptions("business-ads", path)); return url ? <img src={url} alt="Publicidade" className="h-full w-full object-cover" /> : <span className="block h-full w-full animate-pulse bg-muted" />; }
function AdImage({ path }: { path: string }) { const { data:url } = useRQ(signedImageOptions("business-ads", path)); return url ? <img src={url} alt="Publicidade" className="max-h-72 w-full rounded-xl bg-black object-contain" /> : <div className="h-40 animate-pulse rounded-xl bg-muted" />; }
function AdVideo({ path }: { path: string }) { const { data:url } = useRQ(signedImageOptions("business-ads", path)); return url ? <video src={url} controls playsInline className="max-h-72 w-full rounded-xl bg-black object-contain" preload="metadata" /> : null; }
