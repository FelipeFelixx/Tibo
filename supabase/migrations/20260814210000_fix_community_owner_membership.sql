-- ============================================================
-- CORREÇÃO DEFINITIVA:
-- O owner precisa existir em community_members.
-- Isso garante:
--   - aparecer na lista de membros
--   - role = owner
--   - permanecer membro
--   - permissões de admin/edição/moderação
--   - member_count correto
-- ============================================================

-- ------------------------------------------------------------
-- 1. Garante que toda comunidade existente tenha seu owner
--    registrado como membro.
-- ------------------------------------------------------------

INSERT INTO public.community_members (
  community_id,
  user_id,
  role
)
SELECT
  c.id,
  c.owner_id,
  'owner'::public.community_role
FROM public.communities c
WHERE c.owner_id IS NOT NULL
ON CONFLICT (community_id, user_id)
DO UPDATE SET role = 'owner'::public.community_role;

-- ------------------------------------------------------------
-- 2. Corrige os contadores de todas as comunidades.
-- ------------------------------------------------------------

UPDATE public.communities c
SET member_count = (
  SELECT COUNT(*)
  FROM public.community_members cm
  WHERE cm.community_id = c.id
);

-- ------------------------------------------------------------
-- 3. Recria a função responsável por colocar automaticamente
--    o owner em community_members quando uma comunidade nasce.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_community()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_members (
    community_id,
    user_id,
    role
  )
  VALUES (
    NEW.id,
    NEW.owner_id,
    'owner'::public.community_role
  )
  ON CONFLICT (community_id, user_id)
  DO UPDATE SET role = 'owner'::public.community_role;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 4. Garante que o trigger exista.
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS on_community_created
ON public.communities;

CREATE TRIGGER on_community_created
AFTER INSERT ON public.communities
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_community();

-- ------------------------------------------------------------
-- 5. Reforça as funções de autorização:
--    o owner continua sendo owner mesmo que, por qualquer
--    motivo, o registro de membership seja perdido.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_community_member(
  _cid uuid,
  _uid uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = _cid
      AND c.owner_id = _uid
  )
  OR EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = _cid
      AND cm.user_id = _uid
  );
$$;

CREATE OR REPLACE FUNCTION public.get_community_role(
  _cid uuid,
  _uid uuid
)
RETURNS public.community_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN c.owner_id = _uid THEN 'owner'::public.community_role
      ELSE (
        SELECT cm.role
        FROM public.community_members cm
        WHERE cm.community_id = _cid
          AND cm.user_id = _uid
        LIMIT 1
      )
    END
  FROM public.communities c
  WHERE c.id = _cid;
$$;

CREATE OR REPLACE FUNCTION public.can_admin_community(
  _cid uuid,
  _uid uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = _cid
      AND c.owner_id = _uid
  )
  OR EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = _cid
      AND cm.user_id = _uid
      AND cm.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_moderate_community(
  _cid uuid,
  _uid uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = _cid
      AND c.owner_id = _uid
  )
  OR EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = _cid
      AND cm.user_id = _uid
      AND cm.role IN ('owner', 'admin', 'moderator')
  );
$$;

-- ------------------------------------------------------------
-- 6. Garante que os contadores estejam corretos novamente
--    depois de inserir os owners.
-- ------------------------------------------------------------

UPDATE public.communities c
SET member_count = (
  SELECT COUNT(*)
  FROM public.community_members cm
  WHERE cm.community_id = c.id
);

