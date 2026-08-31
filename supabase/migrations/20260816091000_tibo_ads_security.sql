revoke all on function public.get_active_ads(integer) from public, anon;
revoke all on function public.track_ad_event(uuid, public.ad_event_type) from public, anon;
revoke all on function public.is_business_member(uuid, uuid) from public, anon;
revoke all on function public.can_manage_business(uuid, uuid) from public, anon;
grant execute on function public.get_active_ads(integer) to authenticated;
grant execute on function public.track_ad_event(uuid, public.ad_event_type) to authenticated;
grant execute on function public.is_business_member(uuid, uuid) to authenticated;
grant execute on function public.can_manage_business(uuid, uuid) to authenticated;
