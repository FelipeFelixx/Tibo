DROP POLICY IF EXISTS "stories_select_visible" ON public.stories;
CREATE POLICY "stories_select_following_only" ON public.stories
FOR SELECT TO authenticated
USING (
  expires_at > now()
  AND (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = auth.uid()
        AND f.following_id = stories.author_id
    )
  )
);

CREATE OR REPLACE FUNCTION public.can_view_story(_story_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = _story_id
      AND _uid IS NOT NULL
      AND (
        s.author_id = _uid
        OR EXISTS (
          SELECT 1 FROM public.follows f
          WHERE f.follower_id = _uid
            AND f.following_id = s.author_id
        )
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_story(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_view_story(uuid, uuid) TO authenticated, service_role;
