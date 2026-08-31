
-- ============ Enums ============
CREATE TYPE public.post_privacy AS ENUM ('publico','amigos','comunidade','rascunho');
CREATE TYPE public.reaction_kind AS ENUM ('curtir','amei','interessante','engracado');

-- ============ Helper: are_friends ============
CREATE OR REPLACE FUNCTION public.are_friends(_a UUID, _b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b)
        OR (requester_id = _b AND addressee_id = _a))
  );
$$;
REVOKE EXECUTE ON FUNCTION public.are_friends(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_friends(UUID, UUID) TO authenticated;

-- ============ posts ============
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id UUID,
  content TEXT,
  privacy public.post_privacy NOT NULL DEFAULT 'publico',
  location TEXT,
  link_url TEXT,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_posts_author_created ON public.posts(author_id, created_at DESC);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX idx_posts_privacy ON public.posts(privacy) WHERE privacy = 'publico';

CREATE POLICY "Posts visiveis por privacidade" ON public.posts FOR SELECT USING (
  privacy = 'publico'
  OR (auth.uid() IS NOT NULL AND author_id = auth.uid())
  OR (privacy = 'amigos' AND auth.uid() IS NOT NULL AND public.are_friends(auth.uid(), author_id))
);
CREATE POLICY "Autor cria post" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Autor edita post" ON public.posts FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Autor apaga post" ON public.posts FOR DELETE USING (auth.uid() = author_id);

CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: usuário pode ver o post?
CREATE OR REPLACE FUNCTION public.can_view_post(_post_id UUID, _uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = _post_id AND (
      p.privacy = 'publico'
      OR (_uid IS NOT NULL AND p.author_id = _uid)
      OR (p.privacy = 'amigos' AND _uid IS NOT NULL AND public.are_friends(_uid, p.author_id))
    )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_post(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_post(UUID, UUID) TO authenticated;

-- ============ post_images ============
CREATE TABLE public.post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  width INT,
  height INT,
  position SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_images TO authenticated;
GRANT SELECT ON public.post_images TO anon;
GRANT ALL ON public.post_images TO service_role;
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_post_images_post ON public.post_images(post_id, position);

CREATE POLICY "Imagens seguem visibilidade do post" ON public.post_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND (
    p.privacy = 'publico' OR p.author_id = auth.uid()
    OR (p.privacy = 'amigos' AND auth.uid() IS NOT NULL AND public.are_friends(auth.uid(), p.author_id))
  ))
);
CREATE POLICY "Autor gerencia imagens" ON public.post_images FOR ALL USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid())
);

-- ============ post_videos ============
CREATE TABLE public.post_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration_seconds INT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_videos TO authenticated;
GRANT SELECT ON public.post_videos TO anon;
GRANT ALL ON public.post_videos TO service_role;
ALTER TABLE public.post_videos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_post_videos_post ON public.post_videos(post_id);
CREATE UNIQUE INDEX uq_post_videos_one_per_post ON public.post_videos(post_id);

CREATE POLICY "Videos seguem visibilidade do post" ON public.post_videos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND (
    p.privacy = 'publico' OR p.author_id = auth.uid()
    OR (p.privacy = 'amigos' AND auth.uid() IS NOT NULL AND public.are_friends(auth.uid(), p.author_id))
  ))
);
CREATE POLICY "Autor gerencia videos" ON public.post_videos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid())
);

-- ============ comments ============
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_comments_post_created ON public.comments(post_id, created_at);
CREATE INDEX idx_comments_parent ON public.comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_comments_author ON public.comments(author_id);

CREATE POLICY "Comentarios seguem visibilidade do post" ON public.comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND (
    p.privacy = 'publico' OR p.author_id = auth.uid()
    OR (p.privacy = 'amigos' AND auth.uid() IS NOT NULL AND public.are_friends(auth.uid(), p.author_id))
  ))
);
CREATE POLICY "Autor comenta" ON public.comments FOR INSERT WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND (
    p.privacy = 'publico' OR p.author_id = auth.uid()
    OR (p.privacy = 'amigos' AND public.are_friends(auth.uid(), p.author_id))
  ))
);
CREATE POLICY "Autor edita comentario" ON public.comments FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Autor apaga comentario" ON public.comments FOR DELETE USING (auth.uid() = author_id);

CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ comment_likes ============
CREATE TABLE public.comment_likes (
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT SELECT ON public.comment_likes TO anon;
GRANT ALL ON public.comment_likes TO service_role;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_comment_likes_user ON public.comment_likes(user_id);

CREATE POLICY "Curtidas de comentario visiveis" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Usuario curte comentario" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario descurte comentario" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- ============ post_reactions ============
CREATE TABLE public.post_reactions (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind public.reaction_kind NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_reactions TO authenticated;
GRANT SELECT ON public.post_reactions TO anon;
GRANT ALL ON public.post_reactions TO service_role;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_post_reactions_post ON public.post_reactions(post_id, kind);
CREATE INDEX idx_post_reactions_user ON public.post_reactions(user_id);

CREATE POLICY "Reacoes visiveis" ON public.post_reactions FOR SELECT USING (true);
CREATE POLICY "Usuario reage" ON public.post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario altera propria reacao" ON public.post_reactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario remove propria reacao" ON public.post_reactions FOR DELETE USING (auth.uid() = user_id);

-- ============ saved_posts ============
CREATE TABLE public.saved_posts (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_posts TO authenticated;
GRANT ALL ON public.saved_posts TO service_role;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_saved_posts_user_created ON public.saved_posts(user_id, created_at DESC);

CREATE POLICY "Usuario ve proprios salvos" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuario salva" ON public.saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario remove salvo" ON public.saved_posts FOR DELETE USING (auth.uid() = user_id);

-- ============ shares ============
CREATE TABLE public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.shares TO authenticated;
GRANT SELECT ON public.shares TO anon;
GRANT ALL ON public.shares TO service_role;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_shares_post ON public.shares(post_id);
CREATE INDEX idx_shares_user ON public.shares(user_id, created_at DESC);

CREATE POLICY "Shares visiveis" ON public.shares FOR SELECT USING (true);
CREATE POLICY "Usuario compartilha" ON public.shares FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario remove share" ON public.shares FOR DELETE USING (auth.uid() = user_id);

-- ============ polls ============
CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE REFERENCES public.posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (length(question) BETWEEN 1 AND 200),
  allow_multiple BOOLEAN NOT NULL DEFAULT false,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO authenticated;
GRANT SELECT ON public.polls TO anon;
GRANT ALL ON public.polls TO service_role;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enquetes seguem visibilidade do post" ON public.polls FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND (
    p.privacy = 'publico' OR p.author_id = auth.uid()
    OR (p.privacy = 'amigos' AND auth.uid() IS NOT NULL AND public.are_friends(auth.uid(), p.author_id))
  ))
);
CREATE POLICY "Autor gerencia enquete" ON public.polls FOR ALL USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid())
);

CREATE TABLE public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 100),
  position SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_options TO authenticated;
GRANT SELECT ON public.poll_options TO anon;
GRANT ALL ON public.poll_options TO service_role;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_poll_options_poll ON public.poll_options(poll_id, position);

CREATE POLICY "Opcoes de enquete visiveis" ON public.poll_options FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.polls po JOIN public.posts p ON p.id = po.post_id WHERE po.id = poll_id AND (
    p.privacy = 'publico' OR p.author_id = auth.uid()
    OR (p.privacy = 'amigos' AND auth.uid() IS NOT NULL AND public.are_friends(auth.uid(), p.author_id))
  ))
);
CREATE POLICY "Autor gerencia opcoes" ON public.poll_options FOR ALL USING (
  EXISTS (SELECT 1 FROM public.polls po JOIN public.posts p ON p.id = po.post_id WHERE po.id = poll_id AND p.author_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.polls po JOIN public.posts p ON p.id = po.post_id WHERE po.id = poll_id AND p.author_id = auth.uid())
);

CREATE TABLE public.poll_votes (
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, option_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.poll_votes TO authenticated;
GRANT SELECT ON public.poll_votes TO anon;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_poll_votes_option ON public.poll_votes(option_id);

CREATE POLICY "Votos visiveis" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Usuario vota" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario remove voto" ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);

-- ============ Reports ============
CREATE TABLE public.post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 3 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_id)
);
GRANT SELECT, INSERT ON public.post_reports TO authenticated;
GRANT ALL ON public.post_reports TO service_role;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Denunciante ve propria denuncia" ON public.post_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Usuario denuncia post" ON public.post_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE TABLE public.comment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 3 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, reporter_id)
);
GRANT SELECT, INSERT ON public.comment_reports TO authenticated;
GRANT ALL ON public.comment_reports TO service_role;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Denunciante ve propria denuncia comentario" ON public.comment_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Usuario denuncia comentario" ON public.comment_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
