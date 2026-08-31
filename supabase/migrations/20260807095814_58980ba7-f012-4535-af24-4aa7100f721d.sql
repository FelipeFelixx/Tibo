-- ============ STORIES ============
CREATE TYPE public.story_media_type AS ENUM ('image', 'video');

CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_type public.story_media_type NOT NULL,
  storage_path text NOT NULL,
  thumbnail_path text,
  duration_seconds integer,
  caption text,
  music_title text,
  music_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE OR REPLACE FUNCTION public.validate_story()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.media_type = 'video' AND COALESCE(NEW.duration_seconds, 0) > 60 THEN
    RAISE EXCEPTION 'Story video must be 60 seconds or less';
  END IF;
  IF NEW.expires_at <= NEW.created_at THEN
    NEW.expires_at := NEW.created_at + interval '24 hours';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_story BEFORE INSERT OR UPDATE ON public.stories
FOR EACH ROW EXECUTE FUNCTION public.validate_story();

CREATE INDEX idx_stories_author_active ON public.stories (author_id, expires_at DESC);
CREATE INDEX idx_stories_active ON public.stories (expires_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_story(_story_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stories s
    JOIN public.profiles p ON p.id = s.author_id
    WHERE s.id = _story_id
      AND _uid IS NOT NULL
      AND (s.author_id = _uid OR p.perfil_publico OR public.are_friends(_uid, s.author_id))
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_story(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_view_story(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "stories_select_visible" ON public.stories FOR SELECT TO authenticated
USING (
  expires_at > now()
  AND (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = stories.author_id AND p.perfil_publico)
    OR public.are_friends(auth.uid(), author_id)
  )
);
CREATE POLICY "stories_insert_own" ON public.stories FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid());
CREATE POLICY "stories_update_own" ON public.stories FOR UPDATE TO authenticated
USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "stories_delete_own" ON public.stories FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- ============ STORY VIEWS ============
CREATE TABLE public.story_views (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);
CREATE INDEX idx_story_views_story ON public.story_views (story_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.story_views TO authenticated;
GRANT ALL ON public.story_views TO service_role;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_views_select" ON public.story_views FOR SELECT TO authenticated
USING (
  viewer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_views.story_id AND s.author_id = auth.uid())
);
CREATE POLICY "story_views_insert_self" ON public.story_views FOR INSERT TO authenticated
WITH CHECK (viewer_id = auth.uid() AND public.can_view_story(story_id, auth.uid()));

-- ============ STORY LIKES ============
CREATE TABLE public.story_likes (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);
CREATE INDEX idx_story_likes_story ON public.story_likes (story_id);
GRANT SELECT, INSERT, DELETE ON public.story_likes TO authenticated;
GRANT ALL ON public.story_likes TO service_role;
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_likes_select" ON public.story_likes FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_likes.story_id AND s.author_id = auth.uid())
);
CREATE POLICY "story_likes_insert_self" ON public.story_likes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_view_story(story_id, auth.uid()));
CREATE POLICY "story_likes_delete_self" ON public.story_likes FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============ STORY REPLIES ============
CREATE TABLE public.story_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_story_replies_story ON public.story_replies (story_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.story_replies TO authenticated;
GRANT ALL ON public.story_replies TO service_role;
ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_replies_select" ON public.story_replies FOR SELECT TO authenticated
USING (
  author_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_replies.story_id AND s.author_id = auth.uid())
);
CREATE POLICY "story_replies_insert_self" ON public.story_replies FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND public.can_view_story(story_id, auth.uid()));
CREATE POLICY "story_replies_delete_own" ON public.story_replies FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- ============ HIGHLIGHTS ============
CREATE TABLE public.story_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  cover_path text,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_story_highlights_user ON public.story_highlights (user_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_highlights TO authenticated;
GRANT ALL ON public.story_highlights TO service_role;
ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_story_highlights_updated_at BEFORE UPDATE ON public.story_highlights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "highlights_select" ON public.story_highlights FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = story_highlights.user_id AND p.perfil_publico)
  OR public.are_friends(auth.uid(), user_id)
);
CREATE POLICY "highlights_write_own" ON public.story_highlights FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.story_highlight_items (
  highlight_id uuid NOT NULL REFERENCES public.story_highlights(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (highlight_id, story_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_highlight_items TO authenticated;
GRANT ALL ON public.story_highlight_items TO service_role;
ALTER TABLE public.story_highlight_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "highlight_items_select" ON public.story_highlight_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.story_highlights h
  LEFT JOIN public.profiles p ON p.id = h.user_id
  WHERE h.id = story_highlight_items.highlight_id
    AND (h.user_id = auth.uid() OR p.perfil_publico OR public.are_friends(auth.uid(), h.user_id))
));
CREATE POLICY "highlight_items_write_own" ON public.story_highlight_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.story_highlights h WHERE h.id = story_highlight_items.highlight_id AND h.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.story_highlights h WHERE h.id = story_highlight_items.highlight_id AND h.user_id = auth.uid()));

-- Highlighted stories must stay readable after 24h for their owner/viewers
CREATE POLICY "stories_select_highlighted" ON public.stories FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.story_highlight_items hi
  JOIN public.story_highlights h ON h.id = hi.highlight_id
  LEFT JOIN public.profiles p ON p.id = h.user_id
  WHERE hi.story_id = stories.id
    AND (h.user_id = auth.uid() OR p.perfil_publico OR public.are_friends(auth.uid(), h.user_id))
));

-- ============ REELS ============
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_reel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_posts_reels ON public.posts (created_at DESC) WHERE is_reel;

CREATE OR REPLACE FUNCTION public.increment_post_views(_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.can_view_post(_post_id, auth.uid()) THEN
    UPDATE public.posts SET view_count = view_count + 1 WHERE id = _post_id;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.increment_post_views(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.increment_post_views(uuid) TO authenticated, service_role;

-- ============ HASHTAGS ============
CREATE TABLE public.post_hashtags (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, tag)
);
CREATE INDEX idx_post_hashtags_tag ON public.post_hashtags (tag, created_at DESC);
GRANT SELECT ON public.post_hashtags TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_hashtags TO authenticated;
GRANT ALL ON public.post_hashtags TO service_role;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_hashtags_select" ON public.post_hashtags FOR SELECT
USING (public.can_view_post(post_id, auth.uid()));
CREATE POLICY "post_hashtags_insert_author" ON public.post_hashtags FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_hashtags.post_id AND p.author_id = auth.uid()));
CREATE POLICY "post_hashtags_delete_author" ON public.post_hashtags FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_hashtags.post_id AND p.author_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.trending_hashtags(_limit integer DEFAULT 10)
RETURNS TABLE (tag text, uses bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ph.tag, count(*) AS uses
  FROM public.post_hashtags ph
  JOIN public.posts p ON p.id = ph.post_id
  WHERE ph.created_at > now() - interval '7 days'
    AND p.privacy = 'publico'
  GROUP BY ph.tag
  ORDER BY uses DESC, ph.tag
  LIMIT COALESCE(_limit, 10);
$$;
REVOKE EXECUTE ON FUNCTION public.trending_hashtags(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.trending_hashtags(integer) TO anon, authenticated, service_role;

-- Realtime for stories
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;