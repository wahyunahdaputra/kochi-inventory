
create extension if not exists pg_trgm;

create type public.app_role as enum ('super_admin','admin_divisi','staf');

-- ===== departments =====
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.departments to authenticated;
grant all on public.departments to service_role;
alter table public.departments enable row level security;

insert into public.departments (code, name) values ('IT','IT'),('GA','General Affair'),('MT','Maintenance');

-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  department_id uuid references public.departments(id),
  status text not null default 'pending' check (status in ('pending','active','disabled')),
  can_record_stock boolean not null default false,
  can_adjust_stock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.profiles(department_id);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ===== user_roles =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  role public.app_role not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- ===== helper functions =====
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles r join public.profiles p on p.id = r.user_id
    where r.user_id = _user_id and r.role = _role and p.status = 'active')
$$;

create or replace function public.is_super_admin(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_uid, 'super_admin')
$$;

create or replace function public.user_department(_uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select department_id from public.profiles where id = _uid and status = 'active'
$$;

create or replace function public.can_view_dept(_uid uuid, _dept uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin(_uid)
    or (_dept is not null and exists (select 1 from public.profiles p join public.user_roles r on r.user_id = p.id
        where p.id = _uid and p.status = 'active' and p.department_id = _dept))
$$;

create or replace function public.can_manage_dept(_uid uuid, _dept uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin(_uid)
    or (_dept is not null and public.has_role(_uid,'admin_divisi') and public.user_department(_uid) = _dept)
$$;

create or replace function public.can_record_dept(_uid uuid, _dept uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_dept(_uid,_dept)
    or (_dept is not null and public.has_role(_uid,'staf') and public.user_department(_uid) = _dept
        and exists (select 1 from public.profiles where id=_uid and can_record_stock))
$$;

create or replace function public.can_adjust_dept(_uid uuid, _dept uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_dept(_uid,_dept)
    or (_dept is not null and public.has_role(_uid,'staf') and public.user_department(_uid) = _dept
        and exists (select 1 from public.profiles where id=_uid and can_adjust_stock))
$$;

create or replace function public.is_any_admin(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin(_uid) or public.has_role(_uid,'admin_divisi')
$$;

create or replace function public.try_uuid(_t text)
returns uuid language plpgsql immutable as $$
begin return _t::uuid; exception when others then return null; end $$;

-- policies: departments
create policy "dept read" on public.departments for select to authenticated using (true);
create policy "dept insert" on public.departments for insert to authenticated with check (public.is_super_admin(auth.uid()));
create policy "dept update" on public.departments for update to authenticated using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

-- policies: profiles
create policy "profile read" on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_super_admin(auth.uid())
  or (department_id is not null and department_id = public.user_department(auth.uid()) and public.is_any_admin(auth.uid()))
);
create policy "profile update own or super" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_super_admin(auth.uid()))
  with check (id = auth.uid() or public.is_super_admin(auth.uid()));

create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin(auth.uid()) and auth.uid() is not null then
    if new.status is distinct from old.status or new.department_id is distinct from old.department_id
      or new.can_record_stock is distinct from old.can_record_stock or new.can_adjust_stock is distinct from old.can_adjust_stock
      or new.email is distinct from old.email then
      raise exception 'Anda tidak berwenang mengubah status, divisi, atau izin pengguna';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger trg_guard_profile before update on public.profiles for each row execute function public.guard_profile_update();

-- policies: user_roles
create policy "roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_super_admin(auth.uid()) or (public.is_any_admin(auth.uid()) and exists (select 1 from public.profiles p where p.id = user_id and p.department_id = public.user_department(auth.uid()))));
create policy "roles insert" on public.user_roles for insert to authenticated with check (public.is_super_admin(auth.uid()));
create policy "roles update" on public.user_roles for update to authenticated using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "roles delete" on public.user_roles for delete to authenticated using (public.is_super_admin(auth.uid()));

create or replace function public.guard_last_super_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'super_admin' and (tg_op = 'DELETE' or new.role <> 'super_admin') then
    if (select count(*) from public.user_roles where role='super_admin' and id <> old.id) = 0 then
      raise exception 'Tidak dapat menghapus Super Admin terakhir';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger trg_last_super before update or delete on public.user_roles for each row execute function public.guard_last_super_admin();

-- new user -> pending profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ===== master data =====
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments(id),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, name)
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  abbreviation text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_person text, phone text, email text, address text, notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments(id),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, name)
);
grant select, insert, update on public.categories, public.units, public.suppliers, public.locations to authenticated;
grant all on public.categories, public.units, public.suppliers, public.locations to service_role;
alter table public.categories enable row level security;
alter table public.units enable row level security;
alter table public.suppliers enable row level security;
alter table public.locations enable row level security;

create policy "cat read" on public.categories for select to authenticated using (department_id is null or public.can_view_dept(auth.uid(), department_id));
create policy "cat insert" on public.categories for insert to authenticated with check (case when department_id is null then public.is_super_admin(auth.uid()) else public.can_manage_dept(auth.uid(), department_id) end);
create policy "cat update" on public.categories for update to authenticated using (case when department_id is null then public.is_super_admin(auth.uid()) else public.can_manage_dept(auth.uid(), department_id) end) with check (case when department_id is null then public.is_super_admin(auth.uid()) else public.can_manage_dept(auth.uid(), department_id) end);

create policy "loc read" on public.locations for select to authenticated using (department_id is null or public.can_view_dept(auth.uid(), department_id));
create policy "loc insert" on public.locations for insert to authenticated with check (case when department_id is null then public.is_super_admin(auth.uid()) else public.can_manage_dept(auth.uid(), department_id) end);
create policy "loc update" on public.locations for update to authenticated using (case when department_id is null then public.is_super_admin(auth.uid()) else public.can_manage_dept(auth.uid(), department_id) end) with check (case when department_id is null then public.is_super_admin(auth.uid()) else public.can_manage_dept(auth.uid(), department_id) end);

create policy "unit read" on public.units for select to authenticated using (public.user_department(auth.uid()) is not null or public.is_super_admin(auth.uid()));
create policy "unit insert" on public.units for insert to authenticated with check (public.is_super_admin(auth.uid()));
create policy "unit update" on public.units for update to authenticated using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

create policy "sup read" on public.suppliers for select to authenticated using (public.user_department(auth.uid()) is not null or public.is_super_admin(auth.uid()));
create policy "sup insert" on public.suppliers for insert to authenticated with check (public.is_any_admin(auth.uid()));
create policy "sup update" on public.suppliers for update to authenticated using (public.is_any_admin(auth.uid())) with check (public.is_any_admin(auth.uid()));

insert into public.units (name, abbreviation) values ('Pcs','pcs'),('Box','box'),('Roll','roll'),('Botol','btl'),('Meter','m'),('Unit','unit'),('Rim','rim'),('Set','set'),('Liter','L'),('Pack','pack');
insert into public.categories (department_id, name)
select d.id, c.name from public.departments d join (values
 ('IT','Komputer dan Laptop'),('IT','Printer dan Tinta'),('IT','Perangkat Jaringan'),('IT','CCTV'),('IT','Kabel dan Konektor'),('IT','Suku Cadang Komputer'),
 ('GA','ATK'),('GA','Peralatan Kantor'),('GA','Peralatan Kebersihan'),('GA','Perlengkapan Umum'),
 ('MT','Peralatan Listrik'),('MT','Peralatan Mekanik'),('MT','Perlengkapan Perbaikan'),('MT','Suku Cadang'),('MT','Peralatan Kerja')
) as c(code,name) on c.code = d.code;

-- ===== inventory items =====
create sequence public.item_code_seq;
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  department_id uuid not null references public.departments(id),
  category_id uuid references public.categories(id),
  unit_id uuid references public.units(id),
  supplier_id uuid references public.suppliers(id),
  location_id uuid references public.locations(id),
  description text,
  photo_path text,
  item_type text not null default 'consumable' check (item_type in ('consumable','asset')),
  initial_stock numeric(14,2) not null default 0 check (initial_stock >= 0),
  total_in numeric(14,2) not null default 0,
  total_out numeric(14,2) not null default 0,
  total_adjust numeric(14,2) not null default 0,
  current_stock numeric(14,2) not null default 0 check (current_stock >= 0),
  min_stock numeric(14,2) not null default 0 check (min_stock >= 0),
  stock_status text generated always as (case when current_stock <= 0 then 'habis' when current_stock <= min_stock then 'menipis' else 'normal' end) stored,
  purchase_date date,
  unit_price numeric(16,2) not null default 0 check (unit_price >= 0),
  total_value numeric(18,2) generated always as (current_stock * unit_price) stored,
  serial_number text,
  asset_number text,
  brand text,
  model text,
  status text not null default 'active' check (status in ('active','archived')),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.inventory_items(department_id);
create index on public.inventory_items(category_id);
create index on public.inventory_items(status);
create index on public.inventory_items(stock_status);
create index on public.inventory_items(item_type);
create index inventory_items_name_trgm on public.inventory_items using gin (name gin_trgm_ops);
grant select, insert, update on public.inventory_items to authenticated;
grant all on public.inventory_items to service_role;
alter table public.inventory_items enable row level security;
create policy "item read" on public.inventory_items for select to authenticated using (public.can_view_dept(auth.uid(), department_id));
create policy "item insert" on public.inventory_items for insert to authenticated with check (public.can_manage_dept(auth.uid(), department_id));
create policy "item update" on public.inventory_items for update to authenticated using (public.can_manage_dept(auth.uid(), department_id)) with check (public.can_manage_dept(auth.uid(), department_id));

create or replace function public.items_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare dcode text;
begin
  if tg_op = 'INSERT' then
    select code into dcode from public.departments where id = new.department_id;
    new.code := coalesce(dcode,'INV') || '-' || to_char(nextval('public.item_code_seq'), 'FM000000');
    new.total_in := 0; new.total_out := 0; new.total_adjust := 0;
    new.current_stock := new.initial_stock;
    new.created_by := auth.uid();
    new.created_at := now();
  else
    new.code := old.code; new.created_by := old.created_by; new.created_at := old.created_at;
    if new.department_id is distinct from old.department_id then
      raise exception 'Divisi pemilik barang tidak dapat diubah';
    end if;
    if new.initial_stock is distinct from old.initial_stock then
      raise exception 'Stok awal tidak dapat diubah. Gunakan penyesuaian stok';
    end if;
    if coalesce(current_setting('app.stock_write', true),'') <> 'on' and (
      new.total_in is distinct from old.total_in or new.total_out is distinct from old.total_out
      or new.total_adjust is distinct from old.total_adjust or new.current_stock is distinct from old.current_stock) then
      raise exception 'Saldo stok hanya dapat diubah melalui transaksi stok';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger trg_items_before before insert or update on public.inventory_items for each row execute function public.items_before_write();

-- ===== asset units =====
create table public.asset_units (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id),
  department_id uuid not null references public.departments(id),
  asset_number text not null unique,
  serial_number text,
  brand text,
  model text,
  location_id uuid references public.locations(id),
  assigned_to text,
  condition text not null default 'baik' check (condition in ('baik','perlu_perbaikan','rusak','tidak_digunakan')),
  usage_status text not null default 'tersedia' check (usage_status in ('tersedia','digunakan','dipinjam','dihapuskan')),
  purchase_date date,
  purchase_price numeric(16,2) default 0,
  photo_path text,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.asset_units(item_id);
create index on public.asset_units(department_id);
create index on public.asset_units(condition);
grant select, insert, update on public.asset_units to authenticated;
grant all on public.asset_units to service_role;
alter table public.asset_units enable row level security;
create policy "asset read" on public.asset_units for select to authenticated using (public.can_view_dept(auth.uid(), department_id));
create policy "asset insert" on public.asset_units for insert to authenticated with check (public.can_manage_dept(auth.uid(), department_id) and exists (select 1 from public.inventory_items i where i.id = item_id and i.department_id = asset_units.department_id));
create policy "asset update" on public.asset_units for update to authenticated using (public.can_manage_dept(auth.uid(), department_id)) with check (public.can_manage_dept(auth.uid(), department_id));

-- ===== purchases =====
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id),
  supplier_id uuid references public.suppliers(id),
  purchase_date date not null default current_date,
  invoice_number text,
  notes text,
  total_amount numeric(18,2) not null default 0,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  cancel_reason text,
  cancelled_by uuid,
  cancelled_at timestamptz,
  client_request_id uuid unique,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on public.purchases(department_id);
create index on public.purchases(purchase_date);
create index on public.purchases(supplier_id);
create index on public.purchases(invoice_number);
create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id),
  item_id uuid not null references public.inventory_items(id),
  quantity numeric(14,2) not null check (quantity > 0),
  unit_price numeric(16,2) not null default 0 check (unit_price >= 0),
  subtotal numeric(18,2) generated always as (quantity * unit_price) stored
);
create index on public.purchase_items(purchase_id);
create index on public.purchase_items(item_id);
grant select on public.purchases, public.purchase_items to authenticated;
grant all on public.purchases, public.purchase_items to service_role;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
create policy "purchase read" on public.purchases for select to authenticated using (public.can_view_dept(auth.uid(), department_id));
create policy "pitem read" on public.purchase_items for select to authenticated using (exists (select 1 from public.purchases p where p.id = purchase_id and public.can_view_dept(auth.uid(), p.department_id)));

-- ===== stock transactions =====
create table public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id),
  department_id uuid not null references public.departments(id),
  txn_type text not null check (txn_type in ('in','out','adjust','purchase','reversal')),
  bucket text not null check (bucket in ('in','out','adjust')),
  quantity numeric(14,2) not null,
  delta numeric(14,2) not null,
  balance_after numeric(14,2) not null,
  occurred_at timestamptz not null default now(),
  reason text,
  notes text,
  purpose text,
  used_by text,
  supplier_id uuid references public.suppliers(id),
  unit_price numeric(16,2),
  invoice_number text,
  purchase_id uuid references public.purchases(id),
  reversal_of uuid references public.stock_transactions(id),
  reversed_by uuid references public.stock_transactions(id),
  client_request_id uuid unique,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on public.stock_transactions(item_id);
create index on public.stock_transactions(department_id);
create index on public.stock_transactions(txn_type);
create index on public.stock_transactions(occurred_at);
create index on public.stock_transactions(purchase_id);
grant select on public.stock_transactions to authenticated;
grant all on public.stock_transactions to service_role;
alter table public.stock_transactions enable row level security;
create policy "txn read" on public.stock_transactions for select to authenticated using (public.can_view_dept(auth.uid(), department_id));

-- ===== attachments =====
create table public.file_attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('purchase','item','transaction','asset')),
  entity_id uuid not null,
  department_id uuid not null references public.departments(id),
  bucket text not null,
  path text not null unique,
  file_name text,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.file_attachments(entity_type, entity_id);
grant select, insert, delete on public.file_attachments to authenticated;
grant all on public.file_attachments to service_role;
alter table public.file_attachments enable row level security;
create policy "att read" on public.file_attachments for select to authenticated using (public.can_view_dept(auth.uid(), department_id));
create policy "att insert" on public.file_attachments for insert to authenticated with check (public.can_record_dept(auth.uid(), department_id) and uploaded_by = auth.uid());
create policy "att delete" on public.file_attachments for delete to authenticated using (public.can_manage_dept(auth.uid(), department_id));

-- ===== audit logs =====
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  department_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs(created_at desc);
create index on public.audit_logs(entity_type);
create index on public.audit_logs(actor_id);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "audit read super" on public.audit_logs for select to authenticated using (public.is_super_admin(auth.uid()));

create or replace function public.log_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare b jsonb; a jsonb; act text; dept uuid; eid text;
begin
  if tg_op = 'DELETE' then b := to_jsonb(old); else a := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then b := to_jsonb(old); end if;
  act := lower(tg_op);
  if tg_table_name = 'inventory_items' and tg_op = 'UPDATE' then
    if new.status = 'archived' and old.status <> 'archived' then act := 'archive';
    elsif new.status = 'active' and old.status = 'archived' then act := 'restore';
    elsif new.current_stock is distinct from old.current_stock and new.name = old.name then return new; -- stok dicatat lewat transaksi
    end if;
  end if;
  if tg_table_name = 'purchases' and tg_op = 'UPDATE' and new.status = 'cancelled' then act := 'cancel'; end if;
  eid := coalesce(a->>'id', b->>'id', a->>'user_id');
  begin dept := coalesce(a->>'department_id', b->>'department_id')::uuid; exception when others then dept := null; end;
  insert into public.audit_logs(actor_id, actor_email, action, entity_type, entity_id, department_id, before_data, after_data)
  values (auth.uid(), (select email from public.profiles where id = auth.uid()), act, tg_table_name, eid, dept, b, a);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger audit_items after insert or update on public.inventory_items for each row execute function public.log_audit();
create trigger audit_assets after insert or update on public.asset_units for each row execute function public.log_audit();
create trigger audit_profiles after update on public.profiles for each row execute function public.log_audit();
create trigger audit_roles after insert or update or delete on public.user_roles for each row execute function public.log_audit();
create trigger audit_cat after insert or update on public.categories for each row execute function public.log_audit();
create trigger audit_units after insert or update on public.units for each row execute function public.log_audit();
create trigger audit_sup after insert or update on public.suppliers for each row execute function public.log_audit();
create trigger audit_loc after insert or update on public.locations for each row execute function public.log_audit();
create trigger audit_dept after insert or update on public.departments for each row execute function public.log_audit();
create trigger audit_purchases after insert or update on public.purchases for each row execute function public.log_audit();
create trigger audit_txn after insert on public.stock_transactions for each row execute function public.log_audit();

-- ===== app settings =====
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "settings read" on public.app_settings for select to authenticated using (true);
create policy "settings insert" on public.app_settings for insert to authenticated with check (public.is_super_admin(auth.uid()));
create policy "settings update" on public.app_settings for update to authenticated using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
insert into public.app_settings(key, value) values
 ('company', '{"name":"PT Nusa Jelita Lestari","brand":"KOCHI","address":""}'),
 ('upload', '{"max_mb":5}');

-- ===== stock engine =====
create or replace function public._apply_stock(
  p_item uuid, p_type text, p_bucket text, p_qty numeric, p_delta numeric,
  p_occurred timestamptz, p_reason text, p_notes text, p_purpose text, p_used_by text,
  p_supplier uuid, p_price numeric, p_invoice text, p_purchase uuid, p_reversal_of uuid, p_request uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare it public.inventory_items; newbal numeric; tid uuid;
begin
  select * into it from public.inventory_items where id = p_item for update;
  if not found then raise exception 'Barang tidak ditemukan'; end if;
  newbal := it.current_stock + p_delta;
  if newbal < 0 then
    raise exception 'Stok tidak mencukupi untuk %. Stok tersedia: %', it.name, it.current_stock;
  end if;
  perform set_config('app.stock_write','on', true);
  update public.inventory_items set
    total_in = total_in + case when p_bucket='in' then p_delta else 0 end,
    total_out = total_out + case when p_bucket='out' then -p_delta else 0 end,
    total_adjust = total_adjust + case when p_bucket='adjust' then p_delta else 0 end,
    current_stock = newbal
  where id = p_item;
  perform set_config('app.stock_write','off', true);
  insert into public.stock_transactions(item_id, department_id, txn_type, bucket, quantity, delta, balance_after, occurred_at,
    reason, notes, purpose, used_by, supplier_id, unit_price, invoice_number, purchase_id, reversal_of, client_request_id, created_by)
  values (p_item, it.department_id, p_type, p_bucket, p_qty, p_delta, newbal, coalesce(p_occurred, now()),
    p_reason, p_notes, p_purpose, p_used_by, p_supplier, p_price, p_invoice, p_purchase, p_reversal_of, p_request, auth.uid())
  returning id into tid;
  return tid;
end $$;
revoke execute on function public._apply_stock from public, anon, authenticated;

create or replace function public.record_stock_in(p_item uuid, p_qty numeric, p_date timestamptz, p_supplier uuid, p_price numeric,
  p_invoice text, p_notes text, p_reason text, p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare d uuid; existing uuid;
begin
  select id into existing from public.stock_transactions where client_request_id = p_request_id;
  if existing is not null then return existing; end if;
  select department_id into d from public.inventory_items where id = p_item and status = 'active';
  if d is null then raise exception 'Barang tidak ditemukan atau sudah diarsipkan'; end if;
  if not public.can_record_dept(auth.uid(), d) then raise exception 'Akses ditolak: Anda tidak berwenang mencatat barang masuk'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Jumlah harus lebih dari 0'; end if;
  return public._apply_stock(p_item,'in','in',p_qty,p_qty,p_date,coalesce(p_reason,'Barang masuk'),p_notes,null,null,p_supplier,p_price,p_invoice,null,null,p_request_id);
end $$;

create or replace function public.record_stock_out(p_item uuid, p_qty numeric, p_date timestamptz, p_purpose text, p_used_by text,
  p_notes text, p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare d uuid; existing uuid;
begin
  select id into existing from public.stock_transactions where client_request_id = p_request_id;
  if existing is not null then return existing; end if;
  select department_id into d from public.inventory_items where id = p_item and status = 'active';
  if d is null then raise exception 'Barang tidak ditemukan atau sudah diarsipkan'; end if;
  if not public.can_record_dept(auth.uid(), d) then raise exception 'Akses ditolak: Anda tidak berwenang mencatat barang keluar'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Jumlah harus lebih dari 0'; end if;
  if coalesce(trim(p_purpose),'') = '' then raise exception 'Tujuan penggunaan wajib diisi'; end if;
  return public._apply_stock(p_item,'out','out',p_qty,-p_qty,p_date,p_purpose,p_notes,p_purpose,p_used_by,null,null,null,null,null,p_request_id);
end $$;

create or replace function public.adjust_stock(p_item uuid, p_delta numeric, p_reason text, p_notes text, p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare d uuid; existing uuid;
begin
  select id into existing from public.stock_transactions where client_request_id = p_request_id;
  if existing is not null then return existing; end if;
  select department_id into d from public.inventory_items where id = p_item and status = 'active';
  if d is null then raise exception 'Barang tidak ditemukan atau sudah diarsipkan'; end if;
  if not public.can_adjust_dept(auth.uid(), d) then raise exception 'Akses ditolak: Anda tidak berwenang melakukan penyesuaian stok'; end if;
  if p_delta is null or p_delta = 0 then raise exception 'Jumlah penyesuaian tidak boleh 0'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'Alasan penyesuaian wajib diisi'; end if;
  return public._apply_stock(p_item,'adjust','adjust',abs(p_delta),p_delta,now(),p_reason,p_notes,null,null,null,null,null,null,null,p_request_id);
end $$;

create or replace function public.reverse_transaction(p_txn uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare t public.stock_transactions; nid uuid;
begin
  select * into t from public.stock_transactions where id = p_txn for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if not public.can_manage_dept(auth.uid(), t.department_id) then raise exception 'Akses ditolak: hanya admin yang dapat membatalkan transaksi'; end if;
  if t.txn_type = 'reversal' then raise exception 'Transaksi pembalik tidak dapat dibatalkan'; end if;
  if t.txn_type = 'purchase' then raise exception 'Transaksi pembelian dibatalkan melalui halaman pembelian'; end if;
  if t.reversed_by is not null then raise exception 'Transaksi sudah dibatalkan sebelumnya'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'Alasan pembatalan wajib diisi'; end if;
  nid := public._apply_stock(t.item_id,'reversal',t.bucket,t.quantity,-t.delta,now(),'Pembatalan: '||p_reason,null,null,null,null,null,t.invoice_number,null,t.id,null);
  update public.stock_transactions set reversed_by = nid where id = t.id;
  return nid;
end $$;

create or replace function public.create_purchase(p_department uuid, p_supplier uuid, p_date date, p_invoice text, p_notes text,
  p_items jsonb, p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare pid uuid; rec jsonb; q numeric; pr numeric; iid uuid; total numeric := 0;
begin
  select id into pid from public.purchases where client_request_id = p_request_id;
  if pid is not null then return pid; end if;
  if not public.can_manage_dept(auth.uid(), p_department) then raise exception 'Akses ditolak: Anda tidak berwenang mencatat pembelian'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Minimal satu barang harus dipilih'; end if;
  insert into public.purchases(department_id, supplier_id, purchase_date, invoice_number, notes, client_request_id, created_by)
  values (p_department, p_supplier, coalesce(p_date, current_date), p_invoice, p_notes, p_request_id, auth.uid()) returning id into pid;
  for rec in select * from jsonb_array_elements(p_items) loop
    iid := (rec->>'item_id')::uuid; q := (rec->>'quantity')::numeric; pr := coalesce((rec->>'unit_price')::numeric, 0);
    if q is null or q <= 0 then raise exception 'Jumlah barang harus lebih dari 0'; end if;
    if pr < 0 then raise exception 'Harga tidak boleh negatif'; end if;
    if not exists (select 1 from public.inventory_items where id = iid and department_id = p_department and status='active') then
      raise exception 'Barang tidak valid untuk divisi ini';
    end if;
    insert into public.purchase_items(purchase_id, item_id, quantity, unit_price) values (pid, iid, q, pr);
    perform public._apply_stock(iid,'purchase','in',q,q,coalesce(p_date,current_date)::timestamptz,'Pembelian',p_notes,null,null,p_supplier,pr,p_invoice,pid,null,null);
    total := total + q*pr;
  end loop;
  update public.purchases set total_amount = total where id = pid;
  return pid;
end $$;

create or replace function public.cancel_purchase(p_purchase uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.purchases; t public.stock_transactions; nid uuid;
begin
  select * into p from public.purchases where id = p_purchase for update;
  if not found then raise exception 'Pembelian tidak ditemukan'; end if;
  if not public.can_manage_dept(auth.uid(), p.department_id) then raise exception 'Akses ditolak'; end if;
  if p.status = 'cancelled' then raise exception 'Pembelian sudah dibatalkan'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'Alasan pembatalan wajib diisi'; end if;
  for t in select * from public.stock_transactions where purchase_id = p.id and txn_type = 'purchase' and reversed_by is null loop
    nid := public._apply_stock(t.item_id,'reversal','in',t.quantity,-t.delta,now(),'Pembatalan pembelian: '||p_reason,null,null,null,t.supplier_id,t.unit_price,t.invoice_number,p.id,t.id,null);
    update public.stock_transactions set reversed_by = nid where id = t.id;
  end loop;
  update public.purchases set status='cancelled', cancel_reason=p_reason, cancelled_by=auth.uid(), cancelled_at=now() where id = p.id;
end $$;

create or replace function public.claim_first_super_admin()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Harus login'; end if;
  perform pg_advisory_xact_lock(424242);
  if exists (select 1 from public.user_roles where role = 'super_admin') then
    raise exception 'Super Admin sudah ada. Hubungi Super Admin untuk persetujuan akun';
  end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'super_admin')
    on conflict (user_id) do update set role = 'super_admin';
  update public.profiles set status = 'active' where id = auth.uid();
end $$;

create or replace function public.super_admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'super_admin')
$$;

-- dashboard (security invoker → RLS applies)
create or replace function public.dashboard_summary(p_department uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare res jsonb; f timestamptz := coalesce(p_from, date_trunc('month', now())::date)::timestamptz;
  t timestamptz := (coalesce(p_to, now()::date) + 1)::timestamptz;
begin
  select jsonb_build_object(
    'total_items', (select count(*) from inventory_items i where i.status='active' and (p_department is null or i.department_id=p_department)),
    'total_stock', (select coalesce(sum(current_stock),0) from inventory_items i where i.status='active' and (p_department is null or i.department_id=p_department)),
    'stock_value', (select coalesce(sum(total_value),0) from inventory_items i where i.status='active' and (p_department is null or i.department_id=p_department)),
    'low_stock', (select count(*) from inventory_items i where i.status='active' and i.stock_status='menipis' and (p_department is null or i.department_id=p_department)),
    'out_of_stock', (select count(*) from inventory_items i where i.status='active' and i.stock_status='habis' and (p_department is null or i.department_id=p_department)),
    'normal_stock', (select count(*) from inventory_items i where i.status='active' and i.stock_status='normal' and (p_department is null or i.department_id=p_department)),
    'purchase_value', (select coalesce(sum(total_amount),0) from purchases p where p.status='confirmed' and p.purchase_date >= f::date and p.purchase_date < t::date and (p_department is null or p.department_id=p_department)),
    'txn_count', (select count(*) from stock_transactions s where s.occurred_at >= f and s.occurred_at < t and (p_department is null or s.department_id=p_department)),
    'txn_this_month', (select count(*) from stock_transactions s where s.occurred_at >= date_trunc('month', now()) and (p_department is null or s.department_id=p_department)),
    'in_qty', (select coalesce(sum(delta),0) from stock_transactions s where s.bucket='in' and s.occurred_at >= f and s.occurred_at < t and (p_department is null or s.department_id=p_department)),
    'out_qty', (select coalesce(-sum(delta),0) from stock_transactions s where s.bucket='out' and s.occurred_at >= f and s.occurred_at < t and (p_department is null or s.department_id=p_department)),
    'by_department', (select coalesce(jsonb_agg(x order by x->>'code'),'[]'::jsonb) from (
        select jsonb_build_object('code', d.code, 'name', d.name, 'items', count(i.id), 'stock', coalesce(sum(i.current_stock),0)) x
        from departments d join inventory_items i on i.department_id = d.id and i.status='active'
        where (p_department is null or d.id = p_department) group by d.code, d.name) q),
    'monthly', (select coalesce(jsonb_agg(x order by x->>'month'),'[]'::jsonb) from (
        select jsonb_build_object('month', to_char(date_trunc('month', occurred_at),'YYYY-MM'),
          'in', coalesce(sum(delta) filter (where bucket='in'),0), 'out', coalesce(-sum(delta) filter (where bucket='out'),0)) x
        from stock_transactions s
        where s.occurred_at >= least(f, date_trunc('month', now()) - interval '5 months') and s.occurred_at < t
          and (p_department is null or s.department_id=p_department)
        group by date_trunc('month', occurred_at)) q)
  ) into res;
  return res;
end $$;

grant execute on function public.record_stock_in, public.record_stock_out, public.adjust_stock, public.reverse_transaction,
  public.create_purchase, public.cancel_purchase, public.claim_first_super_admin, public.super_admin_exists, public.dashboard_summary to authenticated;
revoke execute on function public.record_stock_in, public.record_stock_out, public.adjust_stock, public.reverse_transaction,
  public.create_purchase, public.cancel_purchase, public.claim_first_super_admin, public.dashboard_summary from anon;
