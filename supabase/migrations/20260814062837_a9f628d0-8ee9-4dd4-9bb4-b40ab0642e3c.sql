-- 1. conversation_participants: no direct inserts; only the SECURITY DEFINER RPC may create rows
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='conversation_participants' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.conversation_participants', p.policyname);
  END LOOP;
END $$;

REVOKE INSERT ON public.conversation_participants FROM authenticated, anon;
GRANT SELECT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;

-- 2. posts.link_url: enforce http/https only (idempotent)
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS link_url_safe;
ALTER TABLE public.posts ADD CONSTRAINT link_url_safe
  CHECK (link_url IS NULL OR link_url ~* '^https?://');

-- 3. SECURITY DEFINER functions: never callable by anon/public
REVOKE ALL ON FUNCTION public.trending_hashtags(integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.trending_hashtags(integer) TO authenticated;
REVOKE ALL ON FUNCTION public.can_admin_community(uuid, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.can_moderate_community(uuid, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.is_community_member(uuid, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.get_community_role(uuid, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_story(uuid, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.increment_post_views(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.unread_messages_count() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_community() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.sync_community_member_count() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.touch_conversation_last_message() FROM anon, authenticated, PUBLIC;

-- 4. Storage: authenticated-only reads, strict ownership/participation checks
DROP POLICY IF EXISTS "chat-media read participantes" ON storage.objects;
CREATE POLICY "chat-media read participantes" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (
      (owner = auth.uid() AND (storage.foldername(name))[1] = auth.uid()::text)
      OR EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.image_url = storage.objects.name
          AND public.is_conversation_participant(m.conversation_id, auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "community-media read acesso" ON storage.objects;
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

DROP POLICY IF EXISTS "Post media legivel via post" ON storage.objects;
CREATE POLICY "Post media legivel via post" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'post-media'
    AND (
      (owner = auth.uid() AND (storage.foldername(name))[1] = auth.uid()::text)
      OR EXISTS (
        SELECT 1 FROM public.post_images pi
        WHERE pi.storage_path = storage.objects.name
          AND public.can_view_post(pi.post_id, auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.post_videos pv
        WHERE (pv.storage_path = storage.objects.name OR pv.thumbnail_path = storage.objects.name)
          AND public.can_view_post(pv.post_id, auth.uid())
      )
    )
  );

-- 5. Relationship / engagement metadata: authenticated only (no anonymous reads)
DROP POLICY IF EXISTS "Follows visiveis a autenticados" ON public.follows;
CREATE POLICY "Follows visiveis a autenticados" ON public.follows
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Amizades aceitas visiveis a autenticados" ON public.friendships;
CREATE POLICY "Amizades aceitas visiveis a autenticados" ON public.friendships
  FOR SELECT TO authenticated USING (status = 'accepted');

DROP POLICY IF EXISTS "Curtidas visiveis via post" ON public.comment_likes;
CREATE POLICY "Curtidas visiveis via post" ON public.comment_likes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.comments c
    WHERE c.id = comment_likes.comment_id AND public.can_view_post(c.post_id, auth.uid())
  ));

REVOKE SELECT ON public.follows, public.friendships, public.comment_likes,
  public.post_reactions, public.shares, public.poll_votes FROM anon;