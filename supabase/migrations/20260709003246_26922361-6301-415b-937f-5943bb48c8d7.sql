
-- ============================================================
-- FIX 1: Community creation trigger (owner membership)
-- ============================================================
DROP TRIGGER IF EXISTS on_community_created ON public.communities;
CREATE TRIGGER on_community_created
AFTER INSERT ON public.communities
FOR EACH ROW EXECUTE FUNCTION public.handle_new_community();

-- Ensure member count sync trigger exists
DROP TRIGGER IF EXISTS on_community_member_change ON public.community_members;
CREATE TRIGGER on_community_member_change
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.sync_community_member_count();

-- Allow owner to see own community regardless of visibility (needed for insert().select())
DROP POLICY IF EXISTS "Owner ve propria comunidade" ON public.communities;
CREATE POLICY "Owner ve propria comunidade" ON public.communities
FOR SELECT USING (auth.uid() = owner_id);

-- ============================================================
-- FIX 2: Friendships public read for accepted (to show friends list on public profiles)
-- ============================================================
DROP POLICY IF EXISTS "Amizades aceitas visiveis" ON public.friendships;
CREATE POLICY "Amizades aceitas visiveis" ON public.friendships
FOR SELECT USING (status = 'accepted');

-- ============================================================
-- FIX 3: Direct messaging system
-- ============================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_group BOOLEAN NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conv ON public.conversation_participants(conversation_id);

-- Helper: is user part of a conversation? (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_cid UUID, _uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = _cid AND user_id = _uid);
$$;

-- Policies
CREATE POLICY "Participantes veem conversa" ON public.conversations
FOR SELECT USING (public.is_conversation_participant(id, auth.uid()));
CREATE POLICY "Autenticado cria conversa" ON public.conversations
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Participantes atualizam last_message" ON public.conversations
FOR UPDATE USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Ve proprias participacoes ou co-participantes" ON public.conversation_participants
FOR SELECT USING (public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Adiciona participante" ON public.conversation_participants
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Atualiza proprio last_read" ON public.conversation_participants
FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Sai da conversa" ON public.conversation_participants
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Participantes leem mensagens" ON public.messages
FOR SELECT USING (public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Participante envia mensagem" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND public.is_conversation_participant(conversation_id, auth.uid())
);
CREATE POLICY "Autor apaga mensagem" ON public.messages
FOR DELETE USING (auth.uid() = sender_id);

-- Trigger: update conversation.last_message_at on new message
CREATE OR REPLACE FUNCTION public.touch_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_last_message();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- Helper to find or create 1:1 conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(_other_user UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me UUID := auth.uid();
  _cid UUID;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _me = _other_user THEN RAISE EXCEPTION 'Cannot message yourself'; END IF;

  SELECT cp1.conversation_id INTO _cid
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  JOIN public.conversations c ON c.id = cp1.conversation_id
  WHERE cp1.user_id = _me AND cp2.user_id = _other_user AND c.is_group = false
  LIMIT 1;

  IF _cid IS NOT NULL THEN RETURN _cid; END IF;

  INSERT INTO public.conversations (is_group) VALUES (false) RETURNING id INTO _cid;
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (_cid, _me), (_cid, _other_user);
  RETURN _cid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID) TO authenticated;
