-- ============================================================
-- CORREÇÃO DEFINITIVA: criação de comunidades
-- ============================================================

-- A função roda como SECURITY DEFINER para conseguir criar
-- automaticamente o membro owner depois do INSERT.
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
    'owner'
  )
  ON CONFLICT (community_id, user_id)
  DO UPDATE SET role = 'owner';

  RETURN NEW;
END;
$$;

-- Recria o trigger para garantir que está correto.
DROP TRIGGER IF EXISTS on_community_created
ON public.communities;

CREATE TRIGGER on_community_created
AFTER INSERT ON public.communities
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_community();

-- Permite que o usuário autenticado crie uma comunidade
-- somente quando ele próprio for o owner.
DROP POLICY IF EXISTS "Autenticado cria comunidade"
ON public.communities;

CREATE POLICY "Autenticado cria comunidade"
ON public.communities
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Entrada normal em comunidade pública.
DROP POLICY IF EXISTS "Entrar em publica"
ON public.community_members;

CREATE POLICY "Entrar em publica"
ON public.community_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'member'
  AND EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = community_id
      AND c.visibility = 'publica'
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.communities
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.community_members
TO authenticated;
