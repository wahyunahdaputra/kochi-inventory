create table public.stock_requests (request_id uuid primary key, actor_id uuid not null, operation text not null, payload jsonb not null, created_at timestamptz not null default now());
grant all on public.stock_requests to service_role;
alter table public.stock_requests enable row level security;
create or replace function public.validate_stock_request(p_request uuid,p_operation text,p_department uuid,p_payload jsonb) returns void language plpgsql security definer set search_path=public as $$ declare r stock_requests; begin
if auth.uid() is null then raise exception 'Harus login'; end if;
if p_request is null then raise exception 'Identitas transaksi wajib diisi'; end if;
if (p_operation in ('purchase','adjust') and not public.can_manage_dept(auth.uid(),p_department)) or (p_operation in ('in','out') and not public.can_record_dept(auth.uid(),p_department)) then raise exception 'Akses ditolak'; end if;
perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
select * into r from stock_requests where request_id=p_request;
if found then if r.actor_id<>auth.uid() or r.operation<>p_operation or r.payload<>p_payload then raise exception 'Identitas transaksi sudah dipakai untuk data lain'; end if;
else insert into stock_requests(request_id,actor_id,operation,payload) values(p_request,auth.uid(),p_operation,p_payload); end if;
end $$;
revoke execute on function public.validate_stock_request(uuid,text,uuid,jsonb) from public,anon,authenticated;
DO $patch$ declare def text; sig regprocedure; op text; payload text; dept text; begin
for sig,op,payload,dept in select * from (values
('public.record_stock_in(uuid,numeric,timestamptz,uuid,numeric,text,text,text,uuid)'::regprocedure,'in','jsonb_build_array(p_item,p_qty,p_date,p_supplier,p_price,p_invoice,p_notes,p_reason)','(select department_id from inventory_items where id=p_item)'),
('public.record_stock_out(uuid,numeric,timestamptz,text,text,text,uuid)'::regprocedure,'out','jsonb_build_array(p_item,p_qty,p_date,p_purpose,p_used_by,p_notes)','(select department_id from inventory_items where id=p_item)'),
('public.adjust_stock(uuid,numeric,text,text,uuid)'::regprocedure,'adjust','jsonb_build_array(p_item,p_delta,p_reason,p_notes)','(select department_id from inventory_items where id=p_item)'),
('public.create_purchase(uuid,uuid,date,text,text,jsonb,uuid)'::regprocedure,'purchase','jsonb_build_array(p_department,p_supplier,p_date,p_invoice,p_notes,p_items)','p_department')) as f(sig,op,payload,dept)
loop
select pg_get_functiondef(sig) into def;
def:=regexp_replace(def,'begin',format('begin perform public.validate_stock_request(p_request_id,%L,%s,%s);',op,dept,payload),'i');
execute def;
end loop;
end $patch$;
create or replace function public.validate_numeric_stock() returns trigger language plpgsql set search_path=public as $$ begin
if new.initial_stock::text in ('NaN','Infinity','-Infinity') or new.current_stock::text in ('NaN','Infinity','-Infinity') or new.min_stock::text in ('NaN','Infinity','-Infinity') or new.unit_price::text in ('NaN','Infinity','-Infinity') then raise exception 'Jumlah dan harga harus berupa angka valid'; end if; return new; end $$;
create trigger validate_numeric_stock before insert or update on public.inventory_items for each row execute function public.validate_numeric_stock();
create or replace function public.validate_asset_relation() returns trigger language plpgsql set search_path=public as $$ begin
if not exists(select 1 from inventory_items where id=new.item_id and department_id=new.department_id and item_type='asset') then raise exception 'Unit aset harus terkait barang aset di divisi yang sama'; end if;
if new.location_id is not null and not exists(select 1 from locations where id=new.location_id and (department_id is null or department_id=new.department_id)) then raise exception 'Lokasi tidak sesuai divisi'; end if; new.updated_at:=now();return new;end $$;
create trigger validate_asset_relation before insert or update on public.asset_units for each row execute function public.validate_asset_relation();