
-- Messages: reply, read receipts, soft-hide per user
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_for uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to);

-- Conversations: track creator (for group delete permission)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS name text;

-- Allow participants to hard-delete direct conversations (RLS controls who)
DROP POLICY IF EXISTS "Participante deleta conversa" ON public.conversations;
CREATE POLICY "Participante deleta conversa" ON public.conversations
  FOR DELETE TO authenticated
  USING (
    public.is_conversation_participant(id, auth.uid())
    AND (is_group = false OR created_by = auth.uid())
  );

-- ============= user_presence =============
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online','away','offline')),
  last_seen timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Presence readable" ON public.user_presence;
CREATE POLICY "Presence readable" ON public.user_presence
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insere propria presenca" ON public.user_presence;
CREATE POLICY "Insere propria presenca" ON public.user_presence
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Atualiza propria presenca" ON public.user_presence;
CREATE POLICY "Atualiza propria presenca" ON public.user_presence
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_presence_status ON public.user_presence(status, last_seen DESC);

-- Enable realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RPC: mark all messages in a conversation as read for me
CREATE OR REPLACE FUNCTION public.mark_conversation_read(_cid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RETURN; END IF;
  IF NOT public.is_conversation_participant(_cid, _me) THEN RETURN; END IF;
  UPDATE public.conversation_participants
    SET last_read_at = now()
    WHERE conversation_id = _cid AND user_id = _me;
  UPDATE public.messages
    SET read_at = now()
    WHERE conversation_id = _cid AND sender_id <> _me AND read_at IS NULL;
END; $$;

REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

-- RPC: total unread count for badge
CREATE OR REPLACE FUNCTION public.unread_messages_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(cnt), 0)::int FROM (
    SELECT COUNT(m.id) AS cnt
    FROM public.conversation_participants cp
    JOIN public.messages m ON m.conversation_id = cp.conversation_id
    WHERE cp.user_id = auth.uid()
      AND m.sender_id <> auth.uid()
      AND m.created_at > COALESCE(cp.last_read_at, 'epoch'::timestamptz)
      AND NOT (auth.uid() = ANY(m.deleted_for))
    GROUP BY cp.conversation_id
  ) s;
$$;
REVOKE ALL ON FUNCTION public.unread_messages_count() FROM public;
GRANT EXECUTE ON FUNCTION public.unread_messages_count() TO authenticated;
