-- Velora Day 5: learning wait time + stock. Run once in Supabase > SQL Editor
alter table orders add column ready_at timestamptz, add column base_wait_minutes int;
alter table dishes add column stock int check (stock >= 0), add column low_stock_at int not null default 5;

create or replace function stamp_ready() returns trigger language plpgsql as $$
begin
  if new.status = 'ready' and old.status <> 'ready' then new.ready_at := now(); end if;
  return new;
end $$;
create trigger orders_stamp_ready before update on orders for each row execute function stamp_ready();

-- Unscaled estimate: work already queued / staff + longest prep in this order
create or replace function base_wait(p_cafe uuid, p_items jsonb) returns numeric
language sql security definer set search_path = public as $$
  select coalesce((select sum(oi.quantity * d.prep_time_minutes) from order_items oi
      join orders o on o.id = oi.order_id join dishes d on d.id = oi.dish_id
      where o.cafe_id = p_cafe and o.status in ('paid','preparing')), 0)::numeric
    / greatest((select staff_count from cafes where id = p_cafe), 1)
    + coalesce((select max(d.prep_time_minutes) from dishes d
      where d.cafe_id = p_cafe and d.id in (select (e->>'dish_id')::uuid from jsonb_array_elements(p_items) e)), 0);
$$;

-- How much slower or faster this cafe really is than the estimate (last 30 orders, needs 5+)
create or replace function speed_factor(p_cafe uuid) returns numeric
language sql security definer set search_path = public as $$
  select case when count(*) < 5 then 1::numeric
    else least(greatest(avg(extract(epoch from (ready_at - created_at)) / 60 / base_wait_minutes), 0.7), 2.0) end
  from (select ready_at, created_at, base_wait_minutes from orders
        where cafe_id = p_cafe and ready_at is not null and base_wait_minutes > 0
        order by created_at desc limit 30) s;
$$;

create or replace function estimate_wait(p_cafe uuid, p_items jsonb) returns int
language sql security definer set search_path = public as $$
  select ceil(base_wait(p_cafe, p_items) * speed_factor(p_cafe))::int;
$$;

-- remember the unscaled estimate on every new order so learning never feeds on itself
create or replace function stamp_base() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.base_wait_minutes := greatest(1, round(new.estimated_wait_minutes / speed_factor(new.cafe_id)));
  return new;
end $$;
create trigger orders_stamp_base before insert on orders for each row execute function stamp_base();

-- stock goes down with every order; a dish at zero is marked sold out automatically
create or replace function take_stock() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update dishes set stock = greatest(stock - new.quantity, 0),
    is_available = case when stock - new.quantity <= 0 then false else is_available end
  where id = new.dish_id and stock is not null;
  return new;
end $$;
create trigger order_items_take_stock after insert on order_items for each row execute function take_stock();
