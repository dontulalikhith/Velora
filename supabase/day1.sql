-- Velora Day 1: run once in Supabase > SQL Editor
create policy "public reads cafes" on cafes for select to anon using (true);
create policy "public reads dishes" on dishes for select to anon, authenticated using (true);
create policy "public reads tables" on cafe_tables for select to anon, authenticated using (true);
create policy "owner manages tables" on cafe_tables for all to authenticated
  using (cafe_id in (select id from cafes where owner_id = auth.uid()))
  with check (cafe_id in (select id from cafes where owner_id = auth.uid()));

insert into storage.buckets (id, name, public) values ('dish-images', 'dish-images', true) on conflict do nothing;
create policy "public reads dish images" on storage.objects for select using (bucket_id = 'dish-images');
create policy "cafes upload dish images" on storage.objects for insert to authenticated with check (bucket_id = 'dish-images');

insert into cafe_tables (cafe_id, table_number)
select c.id, n from cafes c, generate_series(1, 6) n where c.name = 'Demo Cafe' on conflict do nothing;

insert into dishes (cafe_id, name, category, price, is_veg, prep_time_minutes, rating)
select c.id, d.name, d.category, d.price, d.is_veg, d.prep, d.rating
from cafes c, (values
  ('Masala Chai', 'Drinks', 60, true, 4, 4.6),
  ('Cappuccino', 'Drinks', 140, true, 6, 4.4),
  ('Veg Burger', 'Snacks', 170, true, 12, 4.1),
  ('Chicken Wrap', 'Snacks', 210, false, 14, 4.3)
) as d(name, category, price, is_veg, prep, rating)
where c.name = 'Demo Cafe';
