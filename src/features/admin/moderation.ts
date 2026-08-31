import { supabase } from "@/integrations/supabase/client";

export type ModerationStatus =
  | "pending"
  | "under_review"
  | "resolved"
  | "dismissed";

export type ModerationDecision =
  | "no_action"
  | "content_removed"
  | "content_restricted"
  | "account_restricted"
  | "account_suspended"
  | "account_banned"
  | "community_action"
  | "other";

export type ModerationCase = {
  id: string;
  report_type: "post" | "comment" | "community";
  report_id: string;
  status: ModerationStatus;
  assigned_to: string | null;
  assigned_username: string | null;
  assigned_display_name: string | null;
  decision: ModerationDecision | null;
  internal_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  updated_at: string;
};

export async function listModerationCases(
  status?: ModerationStatus | "all",
): Promise<ModerationCase[]> {
  const { data, error } = await supabase.rpc(
    "admin_list_moderation_cases",
    {
      _status: status && status !== "all" ? status : null,
    },
  );

  if (error) throw error;

  return (data ?? []) as unknown as ModerationCase[];
}

export async function updateModerationCase(input: {
  caseId: string;
  status: ModerationStatus;
  decision?: ModerationDecision | null;
  internalNotes?: string | null;
}) {
  const { error } = await supabase.rpc(
    "admin_update_moderation_case",
    {
      _case_id: input.caseId,
      _status: input.status,
      _decision: input.decision ?? null,
      _internal_notes: input.internalNotes ?? null,
    },
  );

  if (error) throw error;
}

export async function assignModerationCase(
  caseId: string,
  assignedTo: string | null,
) {
  const { error } = await supabase.rpc(
    "admin_assign_moderation_case",
    {
      _case_id: caseId,
      _assigned_to: assignedTo,
    },
  );

  if (error) throw error;
}
