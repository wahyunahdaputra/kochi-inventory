create or replace function public.log_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare b jsonb; a jsonb; act text; dept uuid; eid text;
begin
  if tg_op = 'DELETE' then b := to_jsonb(old); else a := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then b := to_jsonb(old); end if;
  act := lower(tg_op);
  if tg_table_name = 'inventory_items' and tg_op = 'UPDATE' then
    if a->>'status' = 'archived' and b->>'status' <> 'archived' then act := 'archive';
    elsif a->>'status' = 'active' and b->>'status' = 'archived' then act := 'restore';
    elsif (a->>'current_stock')::numeric is distinct from (b->>'current_stock')::numeric and a->>'name' = b->>'name' then return new;
    end if;
  end if;
  if tg_table_name = 'purchases' and tg_op = 'UPDATE' and a->>'status' = 'cancelled' then act := 'cancel'; end if;
  eid := coalesce(a->>'id', b->>'id', a->>'user_id');
  begin dept := coalesce(a->>'department_id', b->>'department_id')::uuid; exception when others then dept := null; end;
  insert into public.audit_logs(actor_id, actor_email, action, entity_type, entity_id, department_id, before_data, after_data)
  values (auth.uid(), (select email from public.profiles where id = auth.uid()), act, tg_table_name, eid, dept, b, a);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;