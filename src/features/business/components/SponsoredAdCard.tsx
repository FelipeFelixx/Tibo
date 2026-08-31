import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ExternalLink, Megaphone } from "lucide-react";
import { getActiveAds, trackAdEvent } from "../api";
import { signedImageOptions } from "@/features/profile/queries";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitAdLead } from "../api";
import { useI18n } from "@/i18n";
import { toast } from "sonner";

export function SponsoredAdCard() {
  const { t } = useI18n();
  const { data: ads = [] } = useQuery({ queryKey: ["tibo-ads", "active"], queryFn: () => getActiveAds(1), staleTime: 60_000 });
  const ad = ads[0];
  const tracked = useRef(false);
  const [leadOpen, setLeadOpen] = useState(false);
  useEffect(() => {
    if (ad && !tracked.current) { tracked.current = true; void trackAdEvent(ad.creative_id, "impression"); }
  }, [ad]);
  if (!ad) return null;
  const initials = ad.business_name.slice(0,2).toUpperCase();
  const isLead = ad.objective === "leads";
  return <article className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="mb-3 flex items-center gap-3"><Avatar className="h-9 w-9"><SignedAvatarImage bucket="business-ads" path={ad.business_avatar_path} alt={ad.business_name} className="h-full w-full object-contain" /><AvatarFallback>{initials}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate font-semibold">{ad.business_name}</span><Badge variant="secondary" className="gap-1 text-[10px]"><Megaphone className="h-3 w-3" />{t("ads.sponsored", "Patrocinado")}</Badge></div><div className="text-xs text-muted-foreground">{t("ads.onTibo", "Publicidade no Tibo")}</div></div></div>{ad.image_path ? <AdImage path={ad.image_path} alt={ad.headline} /> : ad.video_path ? <AdVideo path={ad.video_path} /> : null}<div className="mt-3"><h3 className="font-semibold">{ad.headline}</h3>{ad.body && <p className="mt-1 text-sm text-muted-foreground">{ad.body}</p>}{ad.destination_url && !isLead && <Button asChild className="mt-3" onClick={() => void trackAdEvent(ad.creative_id,"click")}><a href={ad.destination_url} target="_blank" rel="noopener noreferrer nofollow">{ad.cta_label}<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}{isLead && <Button className="mt-3" onClick={() => setLeadOpen(true)}>{ad.cta_label}</Button>}</div>{isLead ? <LeadDialog open={leadOpen} onOpenChange={setLeadOpen} creativeId={ad.creative_id} /> : null}</article>;
}

function LeadDialog({ open, onOpenChange, creativeId }: { open: boolean; onOpenChange: (open: boolean) => void; creativeId: string }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!email.trim() && !phone.trim()) return;
    setBusy(true);
    try {
      await submitAdLead({ creativeId, name, email, phone, idempotencyKey: crypto.randomUUID() });
      toast.success(t("ads.leadSuccess", "Enviado! A empresa poderá entrar em contato com você."));
      onOpenChange(false); setName(""); setEmail(""); setPhone("");
    } catch (e) { toast.error(e instanceof Error ? e.message : t("ads.leadError", "Não foi possível enviar seu contato.")); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogTitle>{t("ads.leadTitle", "Quero saber mais")}</DialogTitle><p className="text-sm text-muted-foreground">{t("ads.leadDesc", "Deixe um contato para a empresa responder.")}</p><div className="space-y-3 pt-2"><div><Label>{t("auth.name", "Nome")}</Label><Input value={name} onChange={e=>setName(e.target.value)} /></div><div><Label>{t("auth.email", "E-mail")}</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div><div><Label>{t("ads.phone", "Telefone")}</Label><Input value={phone} onChange={e=>setPhone(e.target.value)} /></div><Button className="w-full" disabled={busy || (!email.trim() && !phone.trim())} onClick={submit}>{busy ? t("common.loading", "Carregando…") : t("ads.sendLead", "Enviar")}</Button></div></DialogContent></Dialog>;
}
function AdImage({ path, alt }: { path: string; alt: string }) { const { data:url }=useReactQuery(signedImageOptions("business-ads",path)); return url?<img src={url} alt={alt} className="max-h-[520px] w-full rounded-xl bg-black object-contain" loading="lazy" />:<div className="aspect-video animate-pulse rounded-xl bg-muted"/>; }
function AdVideo({ path }: { path: string }) {
  const { data:url }=useReactQuery(signedImageOptions("business-ads",path));
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => () => { ref.current?.pause(); }, [url]);
  return url?<video ref={ref} src={url} controls playsInline className="max-h-[520px] w-full rounded-xl bg-black object-contain" preload="metadata" muted />:<div className="aspect-video animate-pulse rounded-xl bg-muted"/>;
}
