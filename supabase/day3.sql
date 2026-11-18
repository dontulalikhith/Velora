-- Velora Day 3: owner role. Run once in Supabase > SQL Editor
create table platform_owners (user_id uuid primary key references auth.users(id) on delete cascade);
alter table platform_owners enable row level security; -- no policies: only the functions below can read it

create or replace function is_owner() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from platform_owners where user_id = auth.uid());
$$;

create or replace function owner_stats() returns json
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'Not allowed'; end if;
  return (select coalesce(json_agg(r), '[]'::json) from (
    select c.id, c.name,
      count(o.id) filter (where o.status <> 'cancelled') as orders,
      coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0) as revenue,
      count(o.id) filter (where o.created_at > now() - interval '24 hours') as orders_24h,
      round(coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0) * 0.02, 2) as commission_if_2pct
    from cafes c left join orders o on o.cafe_id = c.id
    group by c.id, c.name order by revenue desc) r);
end $$;

grant execute on function is_owner(), owner_stats() to authenticated;

-- AFTER creating your OWNER user in Authentication > Users, run this with its email:
-- insert into platform_owners select id from auth.users where email = 'YOUR-OWNER-EMAIL';
