CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enums
CREATE TYPE public.community_visibility AS ENUM ('publica', 'privada');
CREATE TYPE public.community_role AS ENUM ('owner', 'admin', 'moderator', 'member');
CREATE TYPE public.join_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'declined');

-- Categories
CREATE TABLE public.community_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_categories TO anon, authenticated;
GRANT ALL ON public.community_categories TO service_role;
ALTER TABLE public.community_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categorias visiveis a todos" ON public.community_categories FOR SELECT USING (true);

INSERT INTO public.community_categories (slug, name, icon, position) VALUES
  ('geral', 'Geral', 'Hash', 0),
  ('tecnologia', 'Tecnologia', 'Cpu', 1),
  ('jogos', 'Jogos', 'Gamepad2', 2),
  ('arte', 'Arte & Design', 'Palette', 3),
  ('musica', 'Música', 'Music', 4),
  ('esportes', 'Esportes', 'Trophy', 5),
  ('educacao', 'Educação', 'GraduationCap', 6),
  ('negocios', 'Negócios', 'Briefcase', 7),
  ('lifestyle', 'Lifestyle', 'Sparkles', 8),
  ('humor', 'Humor', 'Laugh', 9);

CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 60),
  description text CHECK (char_length(description) <= 500),
  rules text CHECK (char_length(rules) <= 5000),
  avatar_path text,
  banner_path text,
  category_id uuid REFERENCES public.community_categories(id) ON DELETE SET NULL,
  visibility public.community_visibility NOT NULL DEFAULT 'publica',
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,49}$')
);
CREATE INDEX communities_owner_idx ON public.communities(owner_id);
CREATE INDEX communities_category_idx ON public.communities(category_id);
CREATE INDEX communities_created_idx ON public.communities(created_at DESC);
CREATE INDEX communities_name_trgm_idx ON public.communities USING gin (name public.gin_trgm_ops);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT SELECT ON public.communities TO anon;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.community_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);
CREATE INDEX community_members_user_idx ON public.community_members(user_id);
CREATE INDEX community_members_community_idx ON public.community_members(community_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.community_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.join_request_status NOT NULL DEFAULT 'pending',
  message text CHECK (char_length(message) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX community_join_requests_unique_pending
  ON public.community_join_requests(community_id, user_id) WHERE status = 'pending';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_join_requests TO authenticated;
GRANT ALL ON public.community_join_requests TO service_role;
ALTER TABLE public.community_join_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.community_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.invite_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, invitee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_invites TO authenticated;
GRANT ALL ON public.community_invites TO service_role;
ALTER TABLE public.community_invites ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (target_user_id IS NOT NULL OR post_id IS NOT NULL)
);
GRANT SELECT, INSERT ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS posts_community_idx ON public.posts(community_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_community_member(_cid uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.community_members WHERE community_id = _cid AND user_id = _uid);
$$;

CREATE OR REPLACE FUNCTION public.get_community_role(_cid uuid, _uid uuid)
RETURNS public.community_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.community_members WHERE community_id = _cid AND user_id = _uid;
$$;

CREATE OR REPLACE FUNCTION public.can_moderate_community(_cid uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.community_members
    WHERE community_id = _cid AND user_id = _uid AND role IN ('owner','admin','moderator'));
$$;

CREATE OR REPLACE FUNCTION public.can_admin_community(_cid uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.community_members
    WHERE community_id = _cid AND user_id = _uid AND role IN ('owner','admin'));
$$;

CREATE OR REPLACE FUNCTION public.handle_new_community()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.community_members (community_id, user_id, role) VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_community_created AFTER INSERT ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_community();

CREATE OR REPLACE FUNCTION public.sync_community_member_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER on_member_added AFTER INSERT ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_community_member_count();
CREATE TRIGGER on_member_removed AFTER DELETE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_community_member_count();

CREATE TRIGGER communities_updated_at BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
CREATE POLICY "Comunidades publicas visiveis; privadas so para membros" ON public.communities FOR SELECT
  USING (visibility = 'publica' OR (auth.uid() IS NOT NULL AND public.is_community_member(id, auth.uid())));
CREATE POLICY "Autenticado cria comunidade" ON public.communities FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner ou admin edita" ON public.communities FOR UPDATE
  TO authenticated USING (public.can_admin_community(id, auth.uid()))
  WITH CHECK (public.can_admin_community(id, auth.uid()));
CREATE POLICY "Owner exclui" ON public.communities FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Membros de publica visiveis; privados so a membros" ON public.community_members FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.visibility = 'publica')
    OR (auth.uid() IS NOT NULL AND public.is_community_member(community_id, auth.uid()))
  );
CREATE POLICY "Entrar em publica" ON public.community_members FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id AND role = 'member'
    AND EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.visibility = 'publica')
  );
CREATE POLICY "Admin gerencia membros" ON public.community_members FOR UPDATE
  TO authenticated USING (public.can_admin_community(community_id, auth.uid()))
  WITH CHECK (public.can_admin_community(community_id, auth.uid()));
CREATE POLICY "Sair ou admin remove" ON public.community_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.can_admin_community(community_id, auth.uid()));

CREATE POLICY "Requester ou admin ve solicitacao" ON public.community_join_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.can_admin_community(community_id, auth.uid()));
CREATE POLICY "Solicitar entrada em privada" ON public.community_join_requests FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.visibility = 'privada')
  );
CREATE POLICY "Admin decide solicitacao" ON public.community_join_requests FOR UPDATE
  TO authenticated USING (public.can_admin_community(community_id, auth.uid()))
  WITH CHECK (public.can_admin_community(community_id, auth.uid()));
CREATE POLICY "Requester cancela" ON public.community_join_requests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Ver convites proprios" ON public.community_invites FOR SELECT
  TO authenticated USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);
CREATE POLICY "Membro convida amigo" ON public.community_invites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = inviter_id AND public.is_community_member(community_id, auth.uid()));
CREATE POLICY "Invitee responde" ON public.community_invites FOR UPDATE
  TO authenticated USING (auth.uid() = invitee_id) WITH CHECK (auth.uid() = invitee_id);
CREATE POLICY "Cancelar convite" ON public.community_invites FOR DELETE
  TO authenticated USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Moderador ve reports" ON public.community_reports FOR SELECT
  TO authenticated USING (public.can_moderate_community(community_id, auth.uid()));
CREATE POLICY "Membro denuncia" ON public.community_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id AND public.is_community_member(community_id, auth.uid()));

-- Update can_view_post to include community visibility
CREATE OR REPLACE FUNCTION public.can_view_post(_post_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    LEFT JOIN public.communities c ON c.id = p.community_id
    WHERE p.id = _post_id AND (
      (p.community_id IS NULL AND (
        p.privacy = 'publico'
        OR (_uid IS NOT NULL AND p.author_id = _uid)
        OR (p.privacy = 'amigos' AND _uid IS NOT NULL AND public.are_friends(_uid, p.author_id))
      ))
      OR (p.community_id IS NOT NULL AND (
        c.visibility = 'publica' OR (_uid IS NOT NULL AND public.is_community_member(p.community_id, _uid))
      ))
    )
  );
$$;

DROP POLICY IF EXISTS "Autor edita post" ON public.posts;
CREATE POLICY "Autor ou moderador edita post" ON public.posts FOR UPDATE
  TO authenticated USING (
    auth.uid() = author_id
    OR (community_id IS NOT NULL AND public.can_moderate_community(community_id, auth.uid()))
  ) WITH CHECK (
    auth.uid() = author_id
    OR (community_id IS NOT NULL AND public.can_moderate_community(community_id, auth.uid()))
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.communities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_join_requests;
