insert into storage.buckets (id, name, public)
values ('business-ads', 'business-ads', false)
on conflict (id) do nothing;

drop policy if exists "business ads read members" on storage.objects;
create policy "business ads read members" on storage.objects
for select to authenticated
using (
  bucket_id = 'business-ads'
  and exists (
    select 1 from public.businesses b
    where b.id::text = split_part(storage.objects.name, '/', 1)
      and (b.owner_id = auth.uid() or public.is_business_member(b.id, auth.uid()))
  )
);

drop policy if exists "business ads upload admins" on storage.objects;
create policy "business ads upload admins" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'business-ads'
  and public.can_manage_business((split_part(storage.objects.name, '/', 1))::uuid, auth.uid())
);

drop policy if exists "business ads update admins" on storage.objects;
create policy "business ads update admins" on storage.objects
for update to authenticated
using (
  bucket_id = 'business-ads'
  and public.can_manage_business((split_part(storage.objects.name, '/', 1))::uuid, auth.uid())
)
with check (
  bucket_id = 'business-ads'
  and public.can_manage_business((split_part(storage.objects.name, '/', 1))::uuid, auth.uid())
);

drop policy if exists "business ads delete admins" on storage.objects;
create policy "business ads delete admins" on storage.objects
for delete to authenticated
using (
  bucket_id = 'business-ads'
  and public.can_manage_business((split_part(storage.objects.name, '/', 1))::uuid, auth.uid())
);

drop policy if exists "business ads read active creatives" on storage.objects;
create policy "business ads read active creatives" on storage.objects
for select to authenticated
using (
  bucket_id = 'business-ads'
  and exists (
    select 1
    from public.ad_creatives c
    join public.ad_campaigns ac on ac.id = c.campaign_id
    where (c.image_path = storage.objects.name or c.video_path = storage.objects.name)
      and ac.status = 'active'
      and (ac.start_at is null or ac.start_at <= now())
      and (ac.end_at is null or ac.end_at >= now())
  )
);
