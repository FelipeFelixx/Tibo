import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, BriefcaseBusiness, Megaphone, Plus, Target, Users } from "lucide-react";
import { toast } from "sonner";
import { addBusinessMember, createBusiness, createCampaign, createCreative, createCampaignCheckout, removeBusinessMember, updateCampaign, updateBusiness, uploadBusinessAdMedia, submitBusinessVerification } from "../api";
import { businessesOptions, businessKeys, businessMembersOptions, campaignsOptions, campaignMetricsOptions, creativesOptions, verificationOptions, billingOptions, adAccountOptions } from "../queries";
import type { Database } from "@/integrations/supabase/types";
import { useI18n } from "@/i18n";

type CampaignStatus = Database["public"]["Enums"]["ad_campaign_status"];

const statusLabel: Record<CampaignStatus, string> = { draft: "Rascunho", pending: "Em análise", active: "Ativa", paused: "Pausada", completed: "Concluída", rejected: "Rejeitada" };

export function BusinessDashboard() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: businesses = [], isLoading } = useQuery(businessesOptions());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const business = useMemo(() => businesses.find((b) => b.id === selectedId) ?? businesses[0] ?? null, [businesses, selectedId]);
  const campaigns = useQuery({ ...campaignsOptions(business?.id ?? ""), enabled: !!business });
  const verification = useQuery({ ...verificationOptions(business?.id ?? ""), enabled: !!business });
  const billing = useQuery({ ...billingOptions(business?.id ?? ""), enabled: !!business });
  const adAccount = useQuery({ ...adAccountOptions(business?.id ?? ""), enabled: !!business });
  const [showCreateBusiness, setShowCreateBusiness] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreativeFor, setShowCreativeFor] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;
    if (checkout === "success") toast.success("Pagamento enviado. A Stripe está confirmando o saldo da campanha.");
    if (checkout === "cancelled") toast.message("Checkout cancelado. A campanha continua sem o novo saldo.");
    window.history.replaceState({}, "", "/negocios");
    if (business) qc.invalidateQueries({ queryKey: businessKeys.campaigns(business.id) });
  }, [business, qc]);

  const createBusinessMutation = useMutation({
    mutationFn: (input: { name: string; slug: string; category?: string }) => createBusiness(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: businessKeys.list() }); setShowCreateBusiness(false); toast.success("Empresa criada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createCampaignMutation = useMutation({
    mutationFn: (input: Database["public"]["Tables"]["ad_campaigns"]["Insert"]) => createCampaign(input),
    onSuccess: () => { if (business) qc.invalidateQueries({ queryKey: businessKeys.campaigns(business.id) }); setShowCreateCampaign(false); toast.success("Campanha criada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Carregando Tibo Business…</div>;

  if (!businesses.length) {
    return <CreateBusiness onCreate={(input) => createBusinessMutation.mutate(input)} busy={createBusinessMutation.isPending} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">{t("business.title", "Tibo Business")}</h2></div>
          <p className="text-sm text-muted-foreground">{t("business.subtitle", "Gerencie sua empresa e suas campanhas do Tibo Ads em um só lugar.")}</p>
        </div>
        <div className="flex gap-2">
          <Select value={business.id} onValueChange={setSelectedId}>
            <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
            <SelectContent>{businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowCreateBusiness(true)}><Plus className="mr-2 h-4 w-4" />{t("business.company", "Empresa")}</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={Megaphone} label={t("business.campaigns", "Campanhas")} value={campaigns.data?.length ?? 0} />
        <MetricCard icon={Target} label={t("business.active", "Ativas")} value={campaigns.data?.filter((c) => c.status === "active").length ?? 0} />
        <MetricCard icon={Users} label={t("business.audiences", "Públicos")} value={campaigns.data?.filter((c) => c.target_locations.length > 0).length ?? 0} />
      </div>

      <Tabs defaultValue="campanhas">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="equipe">{t("business.team", "Equipe")}</TabsTrigger>
          <TabsTrigger value="verificacao">{t("business.verification", "Verificação")}</TabsTrigger>
          <TabsTrigger value="faturamento">{t("business.billing", "Faturamento")}</TabsTrigger>
        </TabsList>
        <TabsContent value="campanhas" className="space-y-3 pt-3">
          <div className="flex justify-end"><Button onClick={() => setShowCreateCampaign(true)}><Plus className="mr-2 h-4 w-4" />Nova campanha</Button></div>
          {!campaigns.data?.length ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Você ainda não criou campanhas.</CardContent></Card> : campaigns.data.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} onCreative={() => setShowCreativeFor(campaign.id)} />)}
        </TabsContent>
        <TabsContent value="empresa" className="pt-3"><BusinessCard business={business} /></TabsContent>
        <TabsContent value="equipe" className="pt-3"><TeamCard businessId={business.id} /></TabsContent>
        <TabsContent value="verificacao" className="pt-3"><VerificationCard businessId={business.id} current={verification.data} busy={verification.isLoading} onDone={() => qc.invalidateQueries({ queryKey: businessKeys.verification(business.id) })} /></TabsContent>
        <TabsContent value="faturamento" className="pt-3"><BillingCard billing={billing.data} adAccount={adAccount.data} verificationStatus={business.verification_status} /></TabsContent>
      </Tabs>

      {showCreateBusiness && <CreateBusinessDialog onCancel={() => setShowCreateBusiness(false)} onCreate={(input) => createBusinessMutation.mutate(input)} busy={createBusinessMutation.isPending} />}
      {showCreateCampaign && <CreateCampaignDialog businessId={business.id} onCancel={() => setShowCreateCampaign(false)} onCreate={(input) => createCampaignMutation.mutate(input)} busy={createCampaignMutation.isPending} />}
      {showCreativeFor && <CreativeDialog businessId={business.id} campaignId={showCreativeFor} onCancel={() => setShowCreativeFor(null)} onDone={() => { setShowCreativeFor(null); if (business) qc.invalidateQueries({ queryKey: businessKeys.campaigns(business.id) }); }} />}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: number }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div><div className="text-xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div></CardContent></Card>;
}

function TeamCard({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const { data: members = [] } = useQuery(businessMembersOptions(businessId));
  const [username,setUsername]=useState(""); const [role,setRole]=useState<"admin"|"analyst">("analyst");
  const mutation=useMutation({mutationFn:()=>addBusinessMember(businessId,username,role),onSuccess:()=>{setUsername("");qc.invalidateQueries({queryKey:businessKeys.members(businessId)});toast.success("Membro adicionado")},onError:(e:Error)=>toast.error(e.message)});
  const remove=useMutation({mutationFn:(userId:string)=>removeBusinessMember(businessId,userId),onSuccess:()=>{qc.invalidateQueries({queryKey:businessKeys.members(businessId)});toast.success("Membro removido")},onError:(e:Error)=>toast.error(e.message)});
  return <Card><CardHeader><CardTitle>Equipe</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]"><Input value={username} onChange={e=>setUsername(e.target.value)} placeholder="@username"/><Select value={role} onValueChange={v=>setRole(v as typeof role)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="analyst">Analista</SelectItem></SelectContent></Select><Button disabled={!username.trim()||mutation.isPending} onClick={()=>mutation.mutate()}>Adicionar</Button></div><div className="space-y-2">{members.map((m)=>{const name=[m.profile?.nome,m.profile?.sobrenome].filter(Boolean).join(" ")||m.profile?.username||m.user_id;return <div key={m.user_id} className="flex items-center justify-between rounded-xl border p-3"><div><div className="font-medium">{name}</div><div className="text-xs text-muted-foreground">@{m.profile?.username ?? "usuario"} · {m.role}</div></div>{m.role!=="owner"&&<Button variant="ghost" size="sm" onClick={()=>remove.mutate(m.user_id)}>Remover</Button>}</div>})}</div></CardContent></Card>;
}

function CampaignCard({ campaign, onCreative }: { campaign: Database["public"]["Tables"]["ad_campaigns"]["Row"]; onCreative: () => void }) {
  const qc = useQueryClient();
  const metrics = useQuery(campaignMetricsOptions(campaign.id));
  const creatives = useQuery(creativesOptions(campaign.id));
  const toggle = useMutation({ mutationFn: () => updateCampaign(campaign.id, { status: campaign.status === "active" ? "paused" : "active" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["business"] }), onError: (e: Error) => toast.error(e.message) });
  const checkout = useMutation({ mutationFn: () => createCampaignCheckout(campaign.id), onSuccess: ({ url }) => window.location.assign(url), onError: (e: Error) => toast.error(e.message) });
  const funded = Number(campaign.funded_amount ?? 0);
  const spent = Number(campaign.spent ?? 0);
  const remaining = Math.max(0, funded - spent);
  const needsFunding = Number(campaign.total_budget) > funded;
  const currency = campaign.currency || "USD";
  return <Card><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{campaign.name}</CardTitle><div className="mt-1 flex flex-wrap gap-2"><Badge variant="secondary">{statusLabel[campaign.status]}</Badge><Badge variant="outline">{campaign.objective}</Badge>{campaign.objective === "leads" && <Badge variant="outline">CPL {currency} {Number(campaign.cost_per_lead ?? 0).toFixed(2)}</Badge>}</div></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => toggle.mutate()} disabled={toggle.isPending || needsFunding || !(creatives.data?.length)}>{campaign.status === "active" ? "Pausar" : "Ativar"}</Button></div></div></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4"><Stat label="Impressões" value={metrics.data?.impressions ?? 0} /><Stat label="Cliques" value={metrics.data?.clicks ?? 0} /><Stat label="Leads" value={metrics.data?.leads ?? 0} /><Stat label="Interações" value={metrics.data?.engagements ?? 0} /></div><div className="grid gap-2 sm:grid-cols-3"><Info label="Orçamento" value={`${currency} ${Number(campaign.total_budget).toFixed(2)}`} /><Info label="Pago" value={`${currency} ${funded.toFixed(2)}`} /><Info label="Saldo" value={`${currency} ${remaining.toFixed(2)}`} /></div><div className="flex flex-wrap gap-2">{needsFunding && <Button onClick={() => checkout.mutate()} disabled={checkout.isPending}>{checkout.isPending ? "Abrindo Checkout…" : `Pagar ${currency} ${(Number(campaign.total_budget) - funded).toFixed(2)}`}</Button>}<Button variant="ghost" onClick={onCreative}><Plus className="mr-2 h-4 w-4" />Adicionar criativo</Button></div>{needsFunding ? <p className="text-xs text-muted-foreground">O saldo é pré-pago. A campanha só entra em entrega depois que a Stripe confirmar o pagamento via webhook.</p> : null}</CardContent></Card>;
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-muted/50 p-2"><div className="font-semibold">{value.toLocaleString("pt-BR")}</div><div className="text-[11px] text-muted-foreground">{label}</div></div>; }

function BusinessCard({ business }: { business: Database["public"]["Tables"]["businesses"]["Row"] }) {
  const qc=useQueryClient(); const [name,setName]=useState(business.name); const [category,setCategory]=useState(business.category??""); const [website,setWebsite]=useState(business.website??""); const [email,setEmail]=useState(business.email??"");
  const mutation=useMutation({mutationFn:()=>updateBusiness(business.id,{name:name.trim(),category:category.trim()||null,website:website.trim()||null,email:email.trim()||null}),onSuccess:()=>{qc.invalidateQueries({queryKey:businessKeys.list()});toast.success("Dados da empresa atualizados")},onError:(e:Error)=>toast.error(e.message)});
  return <Card><CardHeader><CardTitle>Dados da empresa</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="Nome"><Input value={name} onChange={e=>setName(e.target.value)}/></Field><Field label="Categoria"><Input value={category} onChange={e=>setCategory(e.target.value)}/></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Site"><Input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://"/></Field><Field label="E-mail"><Input value={email} onChange={e=>setEmail(e.target.value)} /></Field></div><Button disabled={!name.trim()||mutation.isPending} onClick={()=>mutation.mutate()}>Salvar alterações</Button></CardContent></Card>;
}

function Info({ label, value }: { label: string; value: string | null | undefined }) { return <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 truncate">{value || "—"}</div></div>; }

function CreateBusiness({ onCreate, busy }: { onCreate: (input: { name: string; slug: string; category?: string }) => void; busy: boolean }) { return <Card><CardHeader><CardTitle>Comece no Tibo Business</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">Crie o perfil da sua empresa para gerenciar campanhas no Tibo Ads.</p><CreateBusinessForm onSubmit={onCreate} busy={busy} submitLabel="Criar empresa" /></CardContent></Card>; }
function CreateBusinessDialog({ onCancel, onCreate, busy }: { onCancel: () => void; onCreate: (input: { name: string; slug: string; category?: string }) => void; busy: boolean }) { return <Card className="border-primary/30"><CardHeader><CardTitle>Nova empresa</CardTitle></CardHeader><CardContent><CreateBusinessForm onSubmit={onCreate} busy={busy} submitLabel="Criar" /><Button variant="ghost" className="mt-2 w-full" onClick={onCancel}>Cancelar</Button></CardContent></Card>; }
function CreateBusinessForm({ onSubmit, busy, submitLabel }: { onSubmit: (input: { name: string; slug: string; category?: string }) => void; busy: boolean; submitLabel: string }) { const [name,setName]=useState(""); const [slug,setSlug]=useState(""); const [category,setCategory]=useState(""); return <div className="space-y-3"><Field label="Nome"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Minha empresa" /></Field><Field label="Identificador"><Input value={slug} onChange={e=>setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))} placeholder="minha-empresa" /></Field><Field label="Categoria"><Input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Restaurante, loja, serviço…" /></Field><Button className="w-full" disabled={!name.trim()||!slug.trim()||busy} onClick={()=>onSubmit({name:name.trim(),slug:slug.trim(),category:category.trim()||undefined})}>{submitLabel}</Button></div>; }
function CreateCampaignDialog({ businessId, onCancel, onCreate, busy }: { businessId: string; onCancel: () => void; onCreate: (input: Database["public"]["Tables"]["ad_campaigns"]["Insert"]) => void; busy: boolean }) { const [name,setName]=useState(""); const [objective,setObjective]=useState<Database["public"]["Enums"]["ad_objective"]>("leads"); const [daily,setDaily]=useState("10"); const [total,setTotal]=useState("100"); const [cpl,setCpl]=useState("10"); const [currency,setCurrency]=useState("USD"); const [locations,setLocations]=useState(""); return <Card className="border-primary/30"><CardHeader><CardTitle>Nova campanha</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="Nome"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Campanha de lançamento" /></Field><Field label="Objetivo"><Select value={objective} onValueChange={(v)=>setObjective(v as typeof objective)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="leads">Leads — cobrança por lead</SelectItem></SelectContent></Select></Field><div className="grid grid-cols-2 gap-3"><Field label="Moeda"><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD — dólar</SelectItem><SelectItem value="BRL">BRL — real</SelectItem></SelectContent></Select></Field><Field label="Custo por lead"><Input type="number" min="0" step="0.01" value={cpl} onChange={e=>setCpl(e.target.value)} disabled={objective !== "leads"} /></Field></div><div className="grid grid-cols-2 gap-3"><Field label={`Diário (${currency})`}><Input type="number" min="0" value={daily} onChange={e=>setDaily(e.target.value)} /></Field><Field label={`Total (${currency})`}><Input type="number" min="0" value={total} onChange={e=>setTotal(e.target.value)} /></Field></div><Field label="Locais (opcional)"><Input value={locations} onChange={e=>setLocations(e.target.value)} placeholder="São Paulo, SP; Miami, FL" /></Field><div className="flex gap-2"><Button className="flex-1" disabled={!name.trim()||busy||Number(total)<=0||(objective === "leads" && Number(cpl)<=0)} onClick={()=>onCreate({business_id:businessId,name:name.trim(),objective,daily_budget:Number(daily)||0,total_budget:Number(total)||0,currency,funded_amount:0,cost_per_lead:objective === "leads" ? Number(cpl)||0 : 0,target_locations:locations.split(";").map(x=>x.trim()).filter(Boolean),status:"draft"})}>Criar rascunho</Button><Button variant="ghost" onClick={onCancel}>Cancelar</Button></div></CardContent></Card>; }
function CreativeDialog({ businessId, campaignId, onCancel, onDone }: { businessId: string; campaignId: string; onCancel: () => void; onDone: () => void }) {
  const [headline,setHeadline]=useState(""); const [body,setBody]=useState(""); const [url,setUrl]=useState(""); const [file,setFile]=useState<File|null>(null); const [uploading,setUploading]=useState(false);
  const mutation=useMutation({mutationFn:async()=>{ if(!file) throw new Error("Escolha uma imagem ou vídeo"); setUploading(true); try { const path=await uploadBusinessAdMedia(businessId,file); return createCreative({campaign_id:campaignId,headline:headline.trim(),body:body.trim()||null,destination_url:url.trim()||null,image_path:file.type.startsWith("image/")?path:null,video_path:file.type.startsWith("video/")?path:null}); } finally { setUploading(false); }},onSuccess:()=>{toast.success("Criativo salvo");onDone()},onError:(e:Error)=>toast.error(e.message)});
  return <Card className="border-primary/30"><CardHeader><CardTitle>Novo criativo</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="Título"><Input value={headline} onChange={e=>setHeadline(e.target.value)} placeholder="Oferta especial no Tibo" /></Field><Field label="Texto"><Input value={body} onChange={e=>setBody(e.target.value)} placeholder="Uma mensagem curta para o público" /></Field><Field label="URL de destino"><Input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://exemplo.com" /></Field><Field label="Imagem ou vídeo"><Input type="file" accept="image/*,video/*" onChange={e=>setFile(e.target.files?.[0]??null)} /></Field><div className="text-xs text-muted-foreground">A mídia fica protegida no Storage do Tibo Business e só é exibida quando a campanha estiver ativa.</div><div className="flex gap-2"><Button className="flex-1" disabled={!headline.trim()||!file||mutation.isPending||uploading} onClick={()=>mutation.mutate()}>{mutation.isPending||uploading?"Enviando…":"Salvar criativo"}</Button><Button variant="ghost" onClick={onCancel}>Cancelar</Button></div></CardContent></Card>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }

function VerificationCard({ businessId, current, busy, onDone }: { businessId: string; current: {
    legal_name?: string | null;
    tax_id?: string | null;
    country?: string | null;
    legal_address?: string | null;
    contact_email?: string | null;
    website?: string | null;
    status?: string | null;
  } | null | undefined; busy: boolean; onDone: () => void }) {
  const [legalName, setLegalName] = useState(current?.legal_name ?? "");
  const [taxId, setTaxId] = useState(current?.tax_id ?? "");
  const [country, setCountry] = useState(current?.country ?? "BR");
  const [address, setAddress] = useState(current?.legal_address ?? "");
  const [email, setEmail] = useState(current?.contact_email ?? "");
  const [website, setWebsite] = useState(current?.website ?? "");
  const mutation = useMutation({ mutationFn: () => submitBusinessVerification({ businessId, legalName, taxId, country, legalAddress: address, contactEmail: email, website }), onSuccess: () => { toast.success("Solicitação enviada para análise"); onDone(); }, onError: (e: Error) => toast.error(e.message) });
  if (busy) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Carregando verificação…</CardContent></Card>;
  const status = current?.status ?? "pending";
  return <Card><CardHeader><CardTitle>Verificação comercial</CardTitle><p className="text-sm text-muted-foreground">O Tibo Business exige verificação antes da veiculação. Os dados legais ficam separados dos dados públicos.</p></CardHeader><CardContent className="space-y-4"><div className="rounded-xl border bg-muted/30 p-3 text-sm"><strong>Status:</strong> {status === "verified" ? "Verificado" : status === "under_review" ? "Em análise" : status === "rejected" ? "Rejeitado — corrija os dados e reenvie" : "Pendente"}</div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Nome legal</Label><Input value={legalName} onChange={e=>setLegalName(e.target.value)} placeholder="Razão social / nome legal" /></div><div><Label>ID fiscal</Label><Input value={taxId} onChange={e=>setTaxId(e.target.value)} placeholder="CPF, CNPJ, EIN ou equivalente" /></div><div><Label>País</Label><Input value={country} onChange={e=>setCountry(e.target.value.toUpperCase())} maxLength={2} placeholder="BR / US / BO" /></div><div><Label>E-mail comercial</Label><Input value={email} onChange={e=>setEmail(e.target.value)} type="email" /></div><div className="sm:col-span-2"><Label>Endereço legal</Label><Input value={address} onChange={e=>setAddress(e.target.value)} /></div><div className="sm:col-span-2"><Label>Site</Label><Input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://" /></div></div><Button onClick={()=>mutation.mutate()} disabled={mutation.isPending || !legalName.trim() || !taxId.trim() || !country.trim() || !address.trim() || !email.trim()}>{mutation.isPending ? "Enviando…" : "Enviar para análise"}</Button></CardContent></Card>;
}

function BillingCard({ billing, adAccount, verificationStatus }: { billing: {
    payment_configured?: boolean | null;
  } | null | undefined; adAccount: {
    status?: string | null;
  } | null | undefined; verificationStatus: string }) {
  const ready = verificationStatus === "verified" && adAccount?.status === "active";
  return <Card><CardHeader><CardTitle>Faturamento e conta de anúncios</CardTitle><p className="text-sm text-muted-foreground">O Tibo usa Stripe Checkout para pagamentos seguros. O cartão completo nunca é armazenado no Tibo.</p></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">Verificação</div><div className="mt-1 font-semibold">{verificationStatus}</div></div><div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">Conta de anúncios</div><div className="mt-1 font-semibold">{adAccount?.status ?? "pending"}</div></div><div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">Stripe</div><div className="mt-1 font-semibold">{billing?.payment_configured ? "Pagamento confirmado" : "Checkout disponível"}</div></div></div><div className={ready ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm" : "rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm"}>{ready ? "Conta apta a financiar campanhas." : "Primeiro conclua a verificação e a ativação da conta de anúncios."}</div><p className="text-xs text-muted-foreground">Cada campanha é financiada antecipadamente pelo Checkout. O webhook confirma o pagamento e libera o saldo no Tibo Ads.</p></CardContent></Card>;
}
