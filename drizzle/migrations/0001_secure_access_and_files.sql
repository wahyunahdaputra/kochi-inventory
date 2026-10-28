revoke execute on function public.claim_first_super_admin() from public, anon, authenticated;
create or replace function public.can_adjust_dept(_uid uuid, _dept uuid) returns boolean language sql stable security definer set search_path=public as $$ select public.can_manage_dept(_uid,_dept) $$;
create policy "kochi files read" on storage.objects for select to authenticated using (bucket_id='kochi-files' and public.can_view_dept(auth.uid(),public.try_uuid((storage.foldername(name))[1])));
create policy "kochi files insert" on storage.objects for insert to authenticated with check (bucket_id='kochi-files' and public.can_record_dept(auth.uid(),public.try_uuid((storage.foldername(name))[1])));
create policy "kochi files delete" on storage.objects for delete to authenticated using (bucket_id='kochi-files' and public.can_manage_dept(auth.uid(),public.try_uuid((storage.foldername(name))[1])));
create or replace function public.validate_item_relations() returns trigger language plpgsql set search_path=public as $$ begin
if new.category_id is not null and not exists(select 1 from categories where id=new.category_id and (department_id is null or department_id=new.department_id)) then raise exception 'Kategori tidak sesuai divisi'; end if;
if new.location_id is not null and not exists(select 1 from locations where id=new.location_id and (department_id is null or department_id=new.department_id)) then raise exception 'Lokasi tidak sesuai divisi'; end if; return new; end $$;
create trigger validate_item_relations before insert or update on public.inventory_items for each row execute function public.validate_item_relations();
create or replace function public.admin_assign_user(p_user uuid,p_department uuid,p_role public.app_role,p_status text,p_record boolean) returns void language plpgsql security definer set search_path=public as $$ begin
if not public.is_super_admin(auth.uid()) then raise exception 'Akses ditolak'; end if;
perform pg_advisory_xact_lock(424243);
if p_status not in ('pending','active','disabled') then raise exception 'Status tidak valid'; end if;
if p_role <> 'super_admin' and p_department is null and p_status='active' then raise exception 'Divisi wajib dipilih'; end if;
if exists(select 1 from user_roles where user_id=p_user and role='super_admin') and (p_role<>'super_admin' or p_status<>'active') and (select count(*) from user_roles r join profiles p on p.id=r.user_id where r.role='super_admin' and p.status='active' and r.user_id<>p_user)=0 then raise exception 'Tidak dapat menonaktifkan Super Admin terakhir'; end if;
insert into user_roles(user_id,role) values(p_user,p_role) on conflict(user_id) do update set role=excluded.role;
update profiles set department_id=p_department,status=p_status,can_record_stock=p_record,can_adjust_stock=false where id=p_user;
end $$;
revoke execute on function public.admin_assign_user(uuid,uuid,public.app_role,text,boolean) from public,anon;
grant execute on function public.admin_assign_user(uuid,uuid,public.app_role,text,boolean) to authenticated;
create or replace function public.guard_active_super() returns trigger language plpgsql security definer set search_path=public as $$ begin
perform pg_advisory_xact_lock(424243);
if old.status='active' and new.status<>'active' and exists(select 1 from user_roles where user_id=old.id and role='super_admin') and not exists(select 1 from user_roles r join profiles p on p.id=r.user_id where r.role='super_admin' and p.status='active' and p.id<>old.id) then raise exception 'Tidak dapat menonaktifkan Super Admin terakhir'; end if; return new; end $$;
create trigger guard_active_super before update on profiles for each row execute function public.guard_active_super();