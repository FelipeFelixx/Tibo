
-- 1. XSS: constrain link_url to safe schemes
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS link_url_safe;
UPDATE public.posts SET link_url = NULL WHERE link_url IS NOT NULL AND link_url !~* '^https?://';
ALTER TABLE public.posts ADD CONSTRAINT link_url_safe
  CHECK (link_url IS NULL OR link_url ~* '^https?://');

-- 2. Remove exposed phone column (unused by app)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS telefone;

-- 3. Lock down conversation_participants: only SECURITY DEFINER RPC may insert
DROP POLICY IF EXISTS "Adiciona participante" ON public.conversation_participants;
REVOKE INSERT ON public.conversation_participants FROM authenticated, anon;

-- 4. Restrict social relations to authenticated users only
DROP POLICY IF EXISTS "Follows publicos" ON public.follows;
CREATE POLICY "Follows visiveis a autenticados" ON public.follows
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Amizades aceitas visiveis" ON public.friendships;
CREATE POLICY "Amizades aceitas visiveis a autenticados" ON public.friendships
  FOR SELECT TO authenticated USING (status = 'accepted');

-- 5. Post-derived tables now respect post visibility
DROP POLICY IF EXISTS "Curtidas de comentario visiveis" ON public.comment_likes;
CREATE POLICY "Curtidas visiveis via post" ON public.comment_likes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.comments c
    WHERE c.id = comment_likes.comment_id
      AND public.can_view_post(c.post_id, auth.uid())
  ));

DROP POLICY IF EXISTS "Reacoes visiveis" ON public.post_reactions;
CREATE POLICY "Reacoes visiveis via post" ON public.post_reactions
  FOR SELECT TO authenticated
  USING (public.can_view_post(post_id, auth.uid()));

DROP POLICY IF EXISTS "Shares visiveis" ON public.shares;
CREATE POLICY "Shares visiveis via post" ON public.shares
  FOR SELECT TO authenticated
  USING (public.can_view_post(post_id, auth.uid()));

DROP POLICY IF EXISTS "Votos visiveis" ON public.poll_votes;
CREATE POLICY "Votos visiveis via post" ON public.poll_votes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.polls pl
    WHERE pl.id = poll_votes.poll_id
      AND public.can_view_post(pl.post_id, auth.uid())
  ));

-- 6. Storage: chat-media only for participants + own uploads
DROP POLICY IF EXISTS "chat-media read auth" ON storage.objects;
CREATE POLICY "chat-media read participantes" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.image_url = storage.objects.name
          AND public.is_conversation_participant(m.conversation_id, auth.uid())
      )
    )
  );

-- 7. Storage: post-media respeita visibilidade do post
DROP POLICY IF EXISTS "Post media legivel autenticado" ON storage.objects;
CREATE POLICY "Post media legivel via post" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'post-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.post_images pi
        WHERE pi.storage_path = storage.objects.name
          AND public.can_view_post(pi.post_id, auth.uid())
      )
    )
  );

-- 8. Storage: community-media só para membros ou comunidade pública
DROP POLICY IF EXISTS "community-media read auth" ON storage.objects;
CREATE POLICY "community-media read acesso" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'community-media'
    AND EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id::text = split_part(storage.objects.name, '/', 1)
        AND (c.visibility = 'publica' OR public.is_community_member(c.id, auth.uid()))
    )
  );

-- 9. Restringir EXECUTE em funções SECURITY DEFINER
-- Triggers: nenhum papel externo precisa executar
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_community() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_community_member_count() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_conversation_last_message() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- RPCs de mensagens: só autenticados
REVOKE EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.unread_messages_count() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.unread_messages_count() TO authenticated;

-- Helpers de RLS: precisam ser executáveis por authenticated (usados em policies)
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_admin_community(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_admin_community(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_moderate_community(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_moderate_community(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_community_role(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_role(uuid, uuid) TO authenticated;
