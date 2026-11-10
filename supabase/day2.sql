-- Velora Day 2: run once in Supabase > SQL Editor
create table service_requests (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  table_id uuid not null references cafe_tables(id),
  kind text not null check (kind in ('waiter','bill')),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table service_requests enable row level security;

create policy "owner manages requests" on service_requests for all to authenticated
  using (cafe_id in (select id from cafes where owner_id = auth.uid()))
  with check (cafe_id in (select id from cafes where owner_id = auth.uid()));
create policy "owner manages orders" on orders for all to authenticated
  using (cafe_id in (select id from cafes where owner_id = auth.uid()))
  with check (cafe_id in (select id from cafes where owner_id = auth.uid()));
create policy "owner reads order items" on order_items for select to authenticated
  using (order_id in (select id from orders where cafe_id in (select id from cafes where owner_id = auth.uid())));

-- Wait time = (work already queued / staff) + longest prep in this order
create or replace function estimate_wait(p_cafe uuid, p_items jsonb) returns int
language sql security definer set search_path = public as $$
  select ceil(
    coalesce((select sum(oi.quantity * d.prep_time_minutes) from order_items oi
      join orders o on o.id = oi.order_id join dishes d on d.id = oi.dish_id
      where o.cafe_id = p_cafe and o.status in ('paid','preparing')), 0)::numeric
    / greatest((select staff_count from cafes where id = p_cafe), 1)
    + coalesce((select max(d.prep_time_minutes) from dishes d
      where d.cafe_id = p_cafe and d.id in (select (e->>'dish_id')::uuid from jsonb_array_elements(p_items) e)), 0)
  )::int;
$$;

-- Prices and totals come from the database, never from the browser.
-- PLACEHOLDER PAYMENT: the order is marked paid immediately. Replace with a real gateway later.
create or replace function place_order(p_cafe uuid, p_table int, p_items jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_table uuid; v_order uuid; v_total numeric := 0; v_wait int; e jsonb; d dishes; q int;
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
  update orders set total = v_total where id = v_order;
  insert into payments (order_id, amount, status) values (v_order, v_total, 'paid');
  return v_order;
end $$;

create or replace function get_order(p_id uuid) returns json
language sql security definer set search_path = public as $$
  select json_build_object('status', o.status, 'wait', o.estimated_wait_minutes, 'total', o.total,
    'created_at', o.created_at, 'table', t.table_number,
    'items', (select json_agg(json_build_object('name', d.name, 'qty', oi.quantity))
      from order_items oi join dishes d on d.id = oi.dish_id where oi.order_id = o.id))
  from orders o join cafe_tables t on t.id = o.table_id where o.id = p_id;
$$;

create or replace function request_service(p_cafe uuid, p_table int, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
declare v_table uuid;
begin
  select id into v_table from cafe_tables where cafe_id = p_cafe and table_number = p_table;
  if v_table is null then raise exception 'Invalid table'; end if;
  insert into service_requests (cafe_id, table_id, kind) values (p_cafe, v_table, p_kind);
end $$;

grant execute on function estimate_wait(uuid, jsonb), place_order(uuid, int, jsonb),
  get_order(uuid), request_service(uuid, int, text) to anon, authenticated;

alter publication supabase_realtime add table orders, service_requests;
