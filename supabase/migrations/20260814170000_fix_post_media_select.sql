DROP POLICY IF EXISTS "Post media legivel via post" ON storage.objects;

CREATE POLICY "Post media legivel via post"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'post-media'
  AND (
    (owner = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.post_images pi
      WHERE pi.storage_path = storage.objects.name
        AND public.can_view_post(pi.post_id, auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.post_videos pv
      WHERE (pv.storage_path = storage.objects.name OR pv.thumbnail_path = storage.objects.name)
        AND public.can_view_post(pv.post_id, auth.uid())
    )
  )
);
