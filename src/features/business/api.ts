import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Business = Database["public"]["Tables"]["businesses"]["Row"];
type Campaign = Database["public"]["Tables"]["ad_campaigns"]["Row"];
type Creative = Database["public"]["Tables"]["ad_creatives"]["Row"];

async function uid() {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user.id) throw new Error("Não autenticado");
  return data.session.user.id;
}

export async function listMyBusinesses(): Promise<Business[]> {
  const userId = await uid();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .or(`owner_id.eq.${userId},id.in.(select business_id from business_members where user_id.eq.${userId})`)
    .order("created_at", { ascending: false });
  if (error) {
    // PostgREST does not accept subqueries in .or(). Fall back to a direct membership query.
    const { data: memberships, error: membershipError } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", userId);
    if (membershipError) throw membershipError;
    const ids = memberships.map((m) => m.business_id);
    if (!ids.length) {
      const { data: own, error: ownError } = await supabase.from("businesses").select("*").eq("owner_id", userId);
      if (ownError) throw ownError;
      return own ?? [];
    }
    const { data: businesses, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .in("id", ids.concat([]));
    if (businessError) throw businessError;
    return businesses ?? [];
  }
  return data ?? [];
}

export async function createBusiness(input: Pick<Business, "name" | "slug"> & Partial<Business>) {
  const owner_id = await uid();
  const { data, error } = await supabase.from("businesses").insert({
    owner_id,
    name: input.name,
    slug: input.slug,
    legal_name: input.legal_name ?? null,
    category: input.category ?? null,
    description: input.description ?? null,
    website: input.website ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    country: input.country ?? null,
  }).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateBusiness(id: string, patch: Partial<Business>) {
  const { data, error } = await supabase.from("businesses").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function listCampaigns(businessId: string): Promise<Campaign[]> {
  const { data, error } = await supabase.from("ad_campaigns").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCampaign(input: Database["public"]["Tables"]["ad_campaigns"]["Insert"]) {
  const { data, error } = await supabase.from("ad_campaigns").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateCampaign(id: string, patch: Database["public"]["Tables"]["ad_campaigns"]["Update"]) {
  const { data, error } = await supabase.from("ad_campaigns").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function listCreatives(campaignId: string): Promise<Creative[]> {
  const { data, error } = await supabase.from("ad_creatives").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadBusinessAdMedia(businessId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("business-ads").upload(path, file, { upsert: false, cacheControl: "3600", contentType: file.type });
  if (error) throw error;
  return path;
}

export async function createCreative(input: Database["public"]["Tables"]["ad_creatives"]["Insert"]) {
  const { data, error } = await supabase.from("ad_creatives").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function getActiveAds(limit = 2) {
  const { data, error } = await supabase.rpc("get_active_ads", { _limit: limit });
  if (error) throw error;
  return data ?? [];
}

export async function trackAdEvent(creativeId: string, eventType: "impression" | "click" | "engagement") {
  const { error } = await supabase.rpc("track_ad_event", { _creative_id: creativeId, _event_type: eventType });
  if (error) console.warn("[Tibo Ads] evento não registrado", error.message);
}

export async function campaignMetrics(campaignId: string) {
  const { data: creatives, error: creativeError } = await supabase.from("ad_creatives").select("id").eq("campaign_id", campaignId);
  if (creativeError) throw creativeError;
  const ids = (creatives ?? []).map((c) => c.id);
  if (!ids.length) return { impressions: 0, clicks: 0, engagements: 0, leads: 0 };
  const { data: events, error } = await supabase.from("ad_events").select("event_type").in("creative_id", ids);
  if (error) throw error;
  return {
    impressions: events.filter((e) => e.event_type === "impression").length,
    clicks: events.filter((e) => e.event_type === "click").length,
    engagements: events.filter((e) => e.event_type === "engagement").length,
    leads: events.filter((e) => e.event_type === "lead").length,
  };
}

export async function createCampaignCheckout(campaignId: string) {
  const { data, error } = await supabase.functions.invoke("tibo-create-checkout", {
    body: { campaign_id: campaignId },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("O Checkout não retornou uma URL.");
  return data as { id: string; url: string };
}

export async function submitAdLead(input: {
  creativeId: string;
  name?: string;
  email?: string;
  phone?: string;
  idempotencyKey: string;
}) {
  const { data, error } = await supabase.rpc("track_ad_lead", {
    _creative_id: input.creativeId,
    _name: input.name ?? null,
    _email: input.email ?? null,
    _phone: input.phone ?? null,
    _idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  return data;
}

export async function listBusinessMembers(businessId: string) {
  const { data, error } = await supabase
    .from("business_members")
    .select("business_id,user_id,role,created_at")
    .eq("business_id", businessId)
    .order("created_at");
  if (error) throw error;
  const ids = (data ?? []).map((m) => m.user_id);
  if (!ids.length) return [];
  const { data: profiles, error: profileError } = await supabase.from("profiles").select("id,username,nome,sobrenome,avatar_url").in("id", ids);
  if (profileError) throw profileError;
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return (data ?? []).map((m) => ({ ...m, profile: map.get(m.user_id) ?? null }));
}

export async function addBusinessMember(businessId: string, username: string, role: "admin" | "analyst") {
  const { data: profile, error: profileError } = await supabase.from("profiles").select("id").eq("username", username.trim()).maybeSingle();
  if (profileError) throw profileError;
  if (!profile) throw new Error("Usuário não encontrado");
  const { error } = await supabase.from("business_members").insert({ business_id: businessId, user_id: profile.id, role });
  if (error) throw error;
}

export async function removeBusinessMember(businessId: string, userId: string) {
  const { error } = await supabase.from("business_members").delete().eq("business_id", businessId).eq("user_id", userId);
  if (error) throw error;
}

export async function getBusinessVerification(businessId: string) {
  const { data, error } = await supabase.rpc("get_business_verification", { _business_id: businessId });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function submitBusinessVerification(input: {
  businessId: string;
  legalName: string;
  taxId: string;
  country: string;
  legalAddress: string;
  contactEmail: string;
  website?: string;
}) {
  const { data, error } = await supabase.rpc("submit_business_verification", {
    _business_id: input.businessId,
    _legal_name: input.legalName,
    _tax_id: input.taxId,
    _country: input.country,
    _legal_address: input.legalAddress,
    _contact_email: input.contactEmail,
    _website: input.website || null,
  });
  if (error) throw error;
  return data;
}

export async function getBusinessBilling(businessId: string) {
  const { data, error } = await supabase.rpc("get_business_billing", { _business_id: businessId });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function listAdAccount(businessId: string) {
  const { data, error } = await supabase.from("ad_accounts").select("*").eq("business_id", businessId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateBillingProfile(businessId: string, patch: Database["public"]["Tables"]["billing_profiles"]["Update"]) {
  const { data, error } = await supabase.from("billing_profiles").update(patch).eq("business_id", businessId).select("*").single();
  if (error) throw error;
  return data;
}
