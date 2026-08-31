
CREATE POLICY "Post media legivel autenticado" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'post-media');
CREATE POLICY "Usuario envia propria midia post" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Usuario atualiza propria midia post" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Usuario apaga propria midia post" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
