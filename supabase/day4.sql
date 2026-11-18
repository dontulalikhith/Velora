-- Velora Day 4: offers, ratings, suggestions. Run once in Supabase > SQL Editor
create table offers (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  title text not null,
  percent int not null check (percent between 1 and 90),
  starts time not null,
  ends time not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table offers enable row level security;
create policy "public reads active offers" on offers for select to anon, authenticated using (active);
create policy "owner manages offers" on offers for all to authenticated
  using (cafe_id in (select id from cafes where owner_id = auth.uid()))
  with check (cafe_id in (select id from cafes where owner_id = auth.uid()));

alter table orders add column discount_percent int not null default 0;

-- place_order now applies the best live offer (India time), computed on the server
create or replace function place_order(p_cafe uuid, p_table int, p_items jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_table uuid; v_order uuid; v_total numeric := 0; v_wait int; v_pct int; e jsonb; d dishes; q int;
begin
  select id into v_table from cafe_tables where cafe_id = p_cafe and table_number = p_table;
  if v_table is null then raise exception 'Invalid table'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;
  v_wait := estimate_wait(p_cafe, p_items);
  insert into orders (cafe_id, table_id, status, estimated_wait_minutes)
    values (p_cafe, v_table, 'paid', v_wait) returning id into v_order;
  for e in select * from jsonb_array_elements(p_items) loop
    select * into d from dishes where id = (e->>'dish_id')::uuid and cafe_id = p_cafe and is_available;
    if d.id is null then raise exception 'A dish is no longer available'; end if;
    q := least(greatest((e->>'quantity')::int, 1), 20);
    insert into order_items (order_id, dish_id, quantity, unit_price) values (v_order, d.id, q, d.price);
    v_total := v_total + d.price * q;
  end loop;
  select coalesce(max(percent), 0) into v_pct from offers
    where cafe_id = p_cafe and active and (now() at time zone 'Asia/Kolkata')::time between starts and ends;
  v_total := round(v_total * (100 - v_pct) / 100, 2);
  update orders set total = v_total, discount_percent = v_pct where id = v_order;
  insert into payments (order_id, amount, status) values (v_order, v_total, 'paid'); -- placeholder payment
  return v_order;
end $$;

create or replace function get_order(p_id uuid) returns json
language sql security definer set search_path = public as $$
  select json_build_object('status', o.status, 'wait', o.estimated_wait_minutes, 'total', o.total,
    'created_at', o.created_at, 'table', t.table_number,
    'rated', exists (select 1 from ratings r where r.order_id = o.id),
    'items', (select json_agg(json_build_object('dish_id', d.id, 'name', d.name, 'qty', oi.quantity))
      from order_items oi join dishes d on d.id = oi.dish_id where oi.order_id = o.id))
  from orders o join cafe_tables t on t.id = o.table_id where o.id = p_id;
$$;

create or replace function rate_order(p_order uuid, p_ratings jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare e jsonb;
begin
  if not exists (select 1 from orders where id = p_order and status = 'served') then
    raise exception 'Order is not served yet';
  end if;
  for e in select * from jsonb_array_elements(p_ratings) loop
    insert into ratings (dish_id, order_id, rating)
      select oi.dish_id, p_order, least(greatest((e->>'rating')::int, 1), 5)
      from order_items oi where oi.order_id = p_order and oi.dish_id = (e->>'dish_id')::uuid
      on conflict (order_id, dish_id) do nothing;
    update dishes set rating = (select round(avg(rating)::numeric, 1) from ratings where dish_id = (e->>'dish_id')::uuid)
      where id = (e->>'dish_id')::uuid and id in (select dish_id from order_items where order_id = p_order);
  end loop;
end $$;

-- "Goes well with": dishes most often ordered together, else best rated
create or replace function suggest_dishes(p_cafe uuid, p_ids uuid[]) returns setof dishes
language sql security definer set search_path = public as $$
  select d.* from dishes d
  left join (
    select b.dish_id, count(*) c from order_items a
    join order_items b on a.order_id = b.order_id and b.dish_id <> a.dish_id
    where a.dish_id = any(p_ids) group by b.dish_id
  ) p on p.dish_id = d.id
  where d.cafe_id = p_cafe and d.is_available and not (d.id = any(p_ids))
  order by coalesce(p.c, 0) desc, d.rating desc nulls last limit 3;
$$;

grant execute on function place_order(uuid, int, jsonb), get_order(uuid), rate_order(uuid, jsonb),
  suggest_dishes(uuid, uuid[]) to anon, authenticated;
