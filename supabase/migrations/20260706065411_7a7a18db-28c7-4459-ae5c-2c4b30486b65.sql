
-- Privacy enum
CREATE TYPE public.privacy_audience AS ENUM ('todos','amigos','ninguem');

ALTER TABLE public.profiles
  ADD COLUMN quem_pode_amizade public.privacy_audience NOT NULL DEFAULT 'todos',
  ADD COLUMN quem_pode_seguir public.privacy_audience NOT NULL DEFAULT 'todos',
  ADD COLUMN quem_pode_mensagem public.privacy_audience NOT NULL DEFAULT 'todos';

-- Storage RLS: avatars & covers
-- Leitura pública (para exibir perfis)
CREATE POLICY "Avatars publicamente legiveis" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Covers publicamente legiveis" ON storage.objects
  FOR SELECT USING (bucket_id = 'covers');

-- Usuário só escreve na própria pasta (nome do arquivo prefixado pelo user id)
CREATE POLICY "Usuario envia proprio avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Usuario atualiza proprio avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Usuario apaga proprio avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Usuario envia propria capa" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Usuario atualiza propria capa" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Usuario apaga propria capa" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
