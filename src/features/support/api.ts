import { supabase } from "@/integrations/supabase/client";

export type SupportTicket = {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type AdminSupportTicket = {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  assigned_to: string | null;
  assigned_username: string | null;
  assigned_display_name: string | null;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  internal_notes: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export async function createSupportTicket(input: {
  category: string;
  subject: string;
  description: string;
  priority?: string;
}) {
  const { data, error } = await supabase.rpc("create_support_ticket", {
    _category: input.category,
    _subject: input.subject,
    _description: input.description,
    _priority: input.priority ?? "normal",
  });

  if (error) throw error;

  return data as string;
}

export async function listMySupportTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase.rpc("list_my_support_tickets");

  if (error) throw error;

  return (data ?? []) as SupportTicket[];
}

export async function listAdminSupportTickets(
  status: string = "all",
): Promise<AdminSupportTicket[]> {
  const { data, error } = await supabase.rpc("admin_list_support_tickets", {
    _status: status,
  });

  if (error) throw error;

  return (data ?? []) as AdminSupportTicket[];
}

export async function updateAdminSupportTicket(input: {
  ticketId: string;
  status: string;
  priority?: string | null;
  internalNotes?: string | null;
  resolution?: string | null;
}) {
  const { error } = await supabase.rpc("admin_update_support_ticket", {
    _ticket_id: input.ticketId,
    _status: input.status,
    _priority: input.priority ?? null,
    _internal_notes: input.internalNotes ?? null,
    _resolution: input.resolution ?? null,
  });

  if (error) throw error;
}

export async function assignAdminSupportTicket(
  ticketId: string,
  assignedTo: string | null,
) {
  const { error } = await supabase.rpc("admin_assign_support_ticket", {
    _ticket_id: ticketId,
    _assigned_to: assignedTo,
  });

  if (error) throw error;
}
