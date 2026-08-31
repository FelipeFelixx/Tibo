import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Check, Eye, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { isPlatformAdmin, listBusinessReviews, reviewBusiness, type BusinessReview } from "../business";

export function BusinessReviewDashboard() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const access = useQuery({ queryKey: ["platform-admin-access"], queryFn: isPlatformAdmin });
  const reviews = useQuery({ queryKey: ["platform-admin-business-reviews"], queryFn: listBusinessReviews, enabled: access.data === true });
  const [selected, setSelected] = useState<BusinessReview | null>(null);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BusinessReview["status"] }) => reviewBusiness(id, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-admin-business-reviews"] });
      setSelected(null); setNotes("");
      toast.success(t("admin.reviewUpdated", "Revisão atualizada"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (access.isLoading) return <div className="py-12 text-center text-muted-foreground">{t("common.checkingAccess", "Verificando acesso…")}</div>;
  if (access.data !== true) return <Card><CardContent className="py-12 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-destructive" /><h2 className="mt-3 font-semibold">{t("admin.denied", "Acesso administrativo negado")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("admin.deniedDesc", "Sua conta não possui permissão para revisar empresas.")}</p></CardContent></Card>;
  if (reviews.isLoading) return <div className="py-12 text-center text-muted-foreground">{t("admin.loading", "Carregando solicitações…")}</div>;
  if (reviews.error) return <Card><CardContent className="py-8 text-center text-destructive">{(reviews.error as Error).message}</CardContent></Card>;

  return <div className="space-y-4">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">{t("admin.title", "Aprovação de Tibo Business")}</h2><p className="text-sm text-muted-foreground">{t("admin.subtitle", "Revise empresas antes de liberar publicidade.")}</p></div><Badge variant="outline">{reviews.data?.filter(r => r.status === "pending").length ?? 0} {t("admin.pending", "pendentes")}</Badge></div>
    {!reviews.data?.length ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{t("admin.empty", "Nenhuma solicitação encontrada.")}</CardContent></Card> : reviews.data.map(item => (
      <Card key={item.business_id}>
        <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{item.business_name}</CardTitle><p className="text-sm text-muted-foreground">{item.legal_name} · {item.country}</p></div><Badge>{item.status}</Badge></div></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 text-sm sm:grid-cols-2"><div><strong>Identificação:</strong> {item.tax_id}</div><div><strong>E-mail:</strong> {item.contact_email}</div><div className="sm:col-span-2"><strong>Endereço:</strong> {item.legal_address}</div>{item.website && <div className="sm:col-span-2"><strong>Site:</strong> {item.website}</div>}</div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => {setSelected(item);setNotes(item.reviewer_notes ?? "")}}><Eye className="mr-2 h-4 w-4"/>{t("admin.review", "Revisar")}</Button>
            {item.status !== "verified" && <Button onClick={() => mutation.mutate({id:item.business_id,status:"verified"})} disabled={mutation.isPending}><Check className="mr-2 h-4 w-4"/>{t("admin.approve", "Aprovar")}</Button>}
            {item.status !== "rejected" && <Button variant="destructive" onClick={() => mutation.mutate({id:item.business_id,status:"rejected"})} disabled={mutation.isPending}><X className="mr-2 h-4 w-4"/>{t("admin.reject", "Rejeitar")}</Button>}
          </div>
        </CardContent>
      </Card>
    ))}
    {selected && <Card className="border-primary/30"><CardHeader><CardTitle>{t("admin.reviewPrefix", "Revisão: ")}{selected.business_name}</CardTitle></CardHeader><CardContent className="space-y-3"><Textarea placeholder={t("admin.notes", "Observações internas")} value={notes} onChange={e=>setNotes(e.target.value)} /><div className="flex gap-2"><Button variant="outline" onClick={()=>setSelected(null)}>{t("common.cancel", "Cancelar")}</Button><Button onClick={()=>mutation.mutate({id:selected.business_id,status:"under_review"})}>{t("admin.markReview", "Marcar em análise")}</Button><Button onClick={()=>mutation.mutate({id:selected.business_id,status:"verified"})}>{t("admin.approve", "Aprovar")}</Button></div></CardContent></Card>}
  </div>;
}
