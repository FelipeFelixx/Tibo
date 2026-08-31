import { supabase } from "@/integrations/supabase/client";

export type BusinessReview = {
  verification_id: string;
  business_id: string;
  business_name: string;
  owner_id: string;
  legal_name: string;
  tax_id: string;
  country: string;
  legal_address: string;
  contact_email: string;
  website: string | null;
  status: "pending" | "under_review" | "verified" | "rejected";
  reviewer_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

export async function isPlatformAdmin() {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) throw error;
  return !!data;
}

export async function listBusinessReviews(): Promise<BusinessReview[]> {
  const { data, error } = await supabase.rpc("admin_list_business_verifications");
  if (error) throw error;
  return (data ?? []) as BusinessReview[];
}

export async function reviewBusiness(businessId: string, status: BusinessReview["status"], notes?: string) {
  const { error } = await supabase.rpc("admin_review_business_verification", {
    _business_id: businessId,
    _status: status,
    _reviewer_notes: notes ?? null,
  });
  if (error) throw error;
}
