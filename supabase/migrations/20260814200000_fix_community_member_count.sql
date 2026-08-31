-- Corrige a sincronização do contador de membros das comunidades.

CREATE OR REPLACE FUNCTION public.sync_community_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_community_id uuid;
BEGIN
  target_community_id := COALESCE(NEW.community_id, OLD.community_id);

  UPDATE public.communities
  SET member_count = (
    SELECT COUNT(*)
    FROM public.community_members
    WHERE community_id = target_community_id
  )
  WHERE id = target_community_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recria os triggers para INSERT/DELETE.
DROP TRIGGER IF EXISTS on_member_added ON public.community_members;
DROP TRIGGER IF EXISTS on_member_removed ON public.community_members;
DROP TRIGGER IF EXISTS on_community_member_change ON public.community_members;

CREATE TRIGGER on_community_member_change
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_community_member_count();

-- Corrige imediatamente os contadores que já estão errados.
UPDATE public.communities c
SET member_count = (
  SELECT COUNT(*)
  FROM public.community_members cm
  WHERE cm.community_id = c.id
);
