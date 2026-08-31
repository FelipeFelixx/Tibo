-- ============================================================
-- Corrige leitura de posts dentro de comunidades privadas
-- ============================================================

DROP POLICY IF EXISTS "Posts visiveis por privacidade" ON public.posts;

CREATE POLICY "Posts visiveis por privacidade"
ON public.posts
FOR SELECT
TO authenticated, anon
USING (
  -- Posts normais públicos
  privacy = 'publico'

  -- O próprio autor sempre pode ver
  OR (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
  )

  -- Posts entre amigos
  OR (
    privacy = 'amigos'
    AND auth.uid() IS NOT NULL
    AND public.are_friends(auth.uid(), author_id)
  )

  -- Posts de comunidade:
  -- comunidade pública -> qualquer usuário autenticado
  -- comunidade privada -> somente membro
  OR (
    community_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.communities c
      WHERE c.id = posts.community_id
        AND (
          c.visibility = 'publica'
          OR (
            auth.uid() IS NOT NULL
            AND public.is_community_member(c.id, auth.uid())
          )
        )
    )
  )
);
