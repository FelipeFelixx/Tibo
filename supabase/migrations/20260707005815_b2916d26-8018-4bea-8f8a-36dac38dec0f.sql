CREATE POLICY "community-media read auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'community-media');

CREATE POLICY "community-media admin write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-media'
    AND public.can_admin_community((split_part(name, '/', 1))::uuid, auth.uid())
  );

CREATE POLICY "community-media admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'community-media'
    AND public.can_admin_community((split_part(name, '/', 1))::uuid, auth.uid())
  );

CREATE POLICY "community-media admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-media'
    AND public.can_admin_community((split_part(name, '/', 1))::uuid, auth.uid())
  );
