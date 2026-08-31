import { supabase } from "@/integrations/supabase/client";

export type ConversationRow = {
  id: string;
  is_group: boolean;
  created_by: string | null;
  last_message_at: string;
  other: {
    id: string;
    username: string;
    nome: string | null;
    avatar_url: string | null;
  };
  last_message: { content: string | null; image_url: string | null; created_at: string; sender_id: string } | null;
  unread: number;
  last_read_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  reply_to: string | null;
  read_at: string | null;
  deleted_for: string[] | null;
  created_at: string;
};

export async function getOrCreateDirectConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", { _other_user: otherUserId });
  if (error) throw error;
  return data as string;
}

export async function fetchConversations(): Promise<ConversationRow[]> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return [];
  const { data: myParts, error } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", uid);
  if (error) throw error;
  const convIds = (myParts ?? []).map((p) => p.conversation_id);
  if (!convIds.length) return [];
  const readMap = new Map((myParts ?? []).map((p) => [p.conversation_id, p.last_read_at]));

  const [convsRes, partsRes] = await Promise.all([
    supabase.from("conversations").select("id, is_group, created_by, last_message_at").in("id", convIds).order("last_message_at", { ascending: false }),
    supabase.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", convIds),
  ]);
  if (convsRes.error) throw convsRes.error;
  if (partsRes.error) throw partsRes.error;

  const otherIdByConv = new Map<string, string>();
  for (const p of partsRes.data ?? []) {
    if (p.user_id !== uid) otherIdByConv.set(p.conversation_id, p.user_id);
  }
  const otherIds = Array.from(new Set(otherIdByConv.values()));
  const { data: profs } = await supabase.from("profiles").select("id, username, nome, avatar_url").in("id", otherIds);
  const profMap = new Map((profs ?? []).map((p) => [p.id, p]));

  const results: ConversationRow[] = [];
  for (const c of convsRes.data ?? []) {
    const otherId = otherIdByConv.get(c.id);
    if (!otherId) continue;
    const prof = profMap.get(otherId);
    if (!prof) continue;
    const lastRead = readMap.get(c.id) ?? new Date(0).toISOString();
    const [{ data: lastMsg }, unreadRes] = await Promise.all([
      supabase.from("messages").select("content, image_url, created_at, sender_id").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", c.id).gt("created_at", lastRead).neq("sender_id", uid),
    ]);
    results.push({
      id: c.id,
      is_group: (c as { is_group: boolean }).is_group,
      created_by: (c as { created_by: string | null }).created_by ?? null,
      last_message_at: c.last_message_at,
      other: { id: prof.id, username: prof.username, nome: prof.nome, avatar_url: prof.avatar_url },
      last_message: lastMsg ?? null,
      unread: unreadRes.count ?? 0,
      last_read_at: lastRead,
    });
  }
  return results;
}

export async function fetchConversationMeta(conversationId: string) {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Não autenticado");
  const { data: parts, error } = await supabase
    .from("conversation_participants")
    .select("user_id, last_read_at")
    .eq("conversation_id", conversationId);
  if (error) throw error;
  const otherId = parts?.find((p) => p.user_id !== uid)?.user_id;
  if (!otherId) throw new Error("Conversa inválida");
  const { data: prof, error: err2 } = await supabase
    .from("profiles")
    .select("id, username, nome, sobrenome, avatar_url, verificado")
    .eq("id", otherId)
    .single();
  if (err2) throw err2;
  const { data: conv } = await supabase.from("conversations").select("id, is_group, created_by").eq("id", conversationId).maybeSingle();
  return {
    other: prof,
    conv: conv as { id: string; is_group: boolean; created_by: string | null } | null,
    myLastRead: parts?.find((p) => p.user_id === uid)?.last_read_at ?? null,
  };
}

export async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  const rows = (data ?? []) as MessageRow[];
  return uid ? rows.filter((m) => !(m.deleted_for ?? []).includes(uid)) : rows;
}

export type SendPayload = { content?: string; image_url?: string | null; reply_to?: string | null };

export async function sendMessage(conversationId: string, payload: SendPayload): Promise<MessageRow> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Não autenticado");
  const content = payload.content?.trim() || null;
  if (!content && !payload.image_url) throw new Error("Mensagem vazia");
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: uid,
      content,
      image_url: payload.image_url ?? null,
      reply_to: payload.reply_to ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MessageRow;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await supabase.rpc("mark_conversation_read", { _cid: conversationId });
}

export async function uploadChatImage(file: File): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Não autenticado");
  if (file.size > 8 * 1024 * 1024) throw new Error("Imagem maior que 8MB");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("chat-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function leaveConversation(conversationId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase
    .from("conversation_participants")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", uid);
  if (error) throw error;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await supabase.from("conversations").delete().eq("id", conversationId);
  if (error) throw error;
}

export async function hideMessageForMe(messageId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return;
  const { data: msg } = await supabase.from("messages").select("deleted_for").eq("id", messageId).maybeSingle();
  const arr = new Set<string>(((msg?.deleted_for as string[] | null) ?? []));
  arr.add(uid);
  await supabase.from("messages").update({ deleted_for: Array.from(arr) }).eq("id", messageId);
}

export async function deleteMessageForEveryone(messageId: string): Promise<void> {
  const { error } = await supabase.from("messages").delete().eq("id", messageId);
  if (error) throw error;
}

export async function fetchUnreadTotal(): Promise<number> {
  const { data, error } = await supabase.rpc("unread_messages_count");
  if (error) return 0;
  return (data as number) ?? 0;
}

export type SearchableUser = {
  id: string;
  username: string;
  nome: string | null;
  sobrenome: string | null;
  avatar_url: string | null;
};

/** Busca amigos e seguidores/seguidos que combinam com o termo. */
export async function searchChatCandidates(term: string): Promise<SearchableUser[]> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return [];
  const [friends, followers, following] = await Promise.all([
    supabase.from("friendships").select("requester_id,addressee_id").eq("status", "accepted").or(`requester_id.eq.${uid},addressee_id.eq.${uid}`),
    supabase.from("follows").select("follower_id").eq("following_id", uid),
    supabase.from("follows").select("following_id").eq("follower_id", uid),
  ]);
  const ids = new Set<string>();
  for (const r of friends.data ?? []) ids.add(r.requester_id === uid ? r.addressee_id : r.requester_id);
  for (const r of followers.data ?? []) ids.add(r.follower_id);
  for (const r of following.data ?? []) ids.add(r.following_id);
  ids.delete(uid);
  if (!ids.size) return [];
  let q = supabase.from("profiles").select("id,username,nome,sobrenome,avatar_url").in("id", Array.from(ids));
  const t = term.trim();
  if (t) q = q.or(`username.ilike.%${t}%,nome.ilike.%${t}%,sobrenome.ilike.%${t}%`);
  const { data, error } = await q.limit(20);
  if (error) throw error;
  return (data ?? []) as SearchableUser[];
}
