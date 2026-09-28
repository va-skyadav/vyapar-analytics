-- Sprint 1 final security hardening. Applied to production Supabase.
-- This migration documents the final database boundary for Admin authorization.

alter table public.admin_users add column if not exists must_change_password boolean not null default false;
alter table public.admin_users add column if not exists password_changed_at timestamptz;

insert into public.platform_settings ("key","value")
select 'max_fixed_discount','100000'::jsonb
where not exists(select 1 from public.platform_settings where key='max_fixed_discount');

insert into public.admin_permissions(code,name,module,action)
select * from (values
 ('customers.lifecycle.manage','Manage Customer Lifecycle','customers','lifecycle_manage'),
 ('customers.commercial.manage','Manage Commercial Overrides','customers','commercial_manage'),
 ('payments.view','View Payments','payments','view'),
 ('payments.manage','Manage Payments','payments','manage'),
 ('subscriptions.manage','Manage Subscriptions','subscriptions','manage')
) v(code,name,module,action)
where not exists(select 1 from public.admin_permissions p where p.code=v.code);

-- Sensitive Admin writes are exposed only through SECURITY DEFINER RPCs.
revoke insert,update,delete on public.admin_audit_logs from anon,authenticated;
revoke insert,update,delete on public.admin_users from anon,authenticated;
revoke insert,update,delete on public.admin_roles from anon,authenticated;
revoke insert,update,delete on public.admin_role_permissions from anon,authenticated;
revoke insert,update,delete on public.admin_permissions from anon,authenticated;
revoke insert,update,delete on public.business_commercial_overrides from anon,authenticated;

revoke all on public.admin_customer_growth_monthly from anon,authenticated;
revoke all on public.admin_dashboard_summary from anon,authenticated;
revoke all on public.admin_marketing_monthly from anon,authenticated;

revoke all on public.businesses from anon;
revoke all on public.admin_audit_logs from anon;
revoke all on public.admin_users from anon;
revoke all on public.business_commercial_overrides from anon;

revoke all on public.platform_settings from anon;
grant select on public.platform_settings to anon;

drop policy if exists admin_audit_logs_select on public.admin_audit_logs;
create policy admin_audit_logs_select on public.admin_audit_logs
for select to authenticated using(public.has_admin_permission('audit.view'));

drop policy if exists admin_users_select on public.admin_users;
create policy admin_users_select on public.admin_users
for select to authenticated
using(public.has_admin_permission('organization.view') or public.has_admin_permission('organization.manage'));

drop policy if exists admin_users_manage on public.admin_users;
drop policy if exists admin_users_delete on public.admin_users;

drop policy if exists admin_roles_access on public.admin_roles;
create policy admin_roles_access on public.admin_roles
for select to authenticated using(public.has_admin_permission('organization.view'));

drop policy if exists admin_role_permissions_access on public.admin_role_permissions;
create policy admin_role_permissions_access on public.admin_role_permissions
for select to authenticated using(public.has_admin_permission('organization.view'));

drop policy if exists admin_permissions_access on public.admin_permissions;
create policy admin_permissions_access on public.admin_permissions
for select to authenticated using(public.has_admin_permission('organization.view'));

drop policy if exists admin_audit_logs_insert on public.admin_audit_logs;
drop policy if exists admin_audit_logs_update on public.admin_audit_logs;
drop policy if exists admin_audit_logs_delete on public.admin_audit_logs;

drop policy if exists admin_commercial_overrides_modify on public.business_commercial_overrides;
drop policy if exists admin_commercial_overrides_select on public.business_commercial_overrides;
create policy admin_commercial_overrides_select on public.business_commercial_overrides
for select to authenticated using(public.has_admin_permission('customers.view'));

drop policy if exists platform_settings_anon_brand_read on public.platform_settings;
create policy platform_settings_anon_brand_read on public.platform_settings
for select to anon
using(key in ('brand_name','brand_logo_url','brand_favicon_url','brand_admin_subtitle','brand_app_subtitle'));

-- All Admin SECURITY DEFINER functions must set a fixed search_path and enforce
-- authorization internally through has_admin_permission(), or an equivalent
-- identity/role guard for the authentication helper itself.

create or replace function public.admin_append_audit(
 p_action text,p_entity_type text,p_entity_id uuid,
 p_old_data jsonb default null,p_new_data jsonb default null,p_reason text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_admin_id uuid;v_id uuid;
begin
 select id into v_admin_id from public.admin_users where user_id=auth.uid() and status='active' limit 1;
 if v_admin_id is null then raise exception 'Administrator access required'; end if;
 insert into public.admin_audit_logs(admin_user_id,action,entity_type,entity_id,old_data,new_data)
 values(v_admin_id,p_action,p_entity_type,p_entity_id,p_old_data,
   case when p_reason is null then p_new_data else jsonb_build_object('values',coalesce(p_new_data,'{}'::jsonb),'reason',p_reason) end)
 returning id into v_id;
 return v_id;
end $$;

create or replace function public.admin_set_admin_status(
 p_admin_id uuid,p_status text,p_reason text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare a admin_users%rowtype;t admin_users%rowtype;ar int;tr int;old_row jsonb;new_row jsonb;
begin
 if not public.has_admin_permission('organization.manage') then raise exception 'Organization management permission required'; end if;
 if p_status not in ('active','suspended','inactive') then raise exception 'Invalid admin status'; end if;
 if coalesce(trim(p_reason),'')='' then raise exception 'Reason is required'; end if;
 select * into a from public.admin_users where user_id=auth.uid() and status='active' limit 1;
 select * into t from public.admin_users where id=p_admin_id limit 1;
 if a.id is null or t.id is null then raise exception 'Administrator not found'; end if;
 if a.id=t.id then raise exception 'You cannot change your own status'; end if;
 if exists(select 1 from public.admin_roles r where r.id=t.role_id and r.code='SUPER_ADMIN') then raise exception 'SUPER_ADMIN cannot be suspended or deactivated'; end if;
 select case r.code when 'SUPER_ADMIN' then 100 when 'TECHNICAL_ADMIN' then 80 when 'ANALYTICS_ADMIN' then 70 when 'FINANCE_ADMIN' then 70 when 'OPERATIONS_MANAGER' then 60 when 'CUSTOMER_SUPPORT' then 40 when 'TELECALLER' then 20 when 'CEO' then 75 when 'CFO' then 75 when 'COO' then 65 else 0 end into ar from public.admin_roles r where r.id=a.role_id;
 select case r.code when 'SUPER_ADMIN' then 100 when 'TECHNICAL_ADMIN' then 80 when 'ANALYTICS_ADMIN' then 70 when 'FINANCE_ADMIN' then 70 when 'OPERATIONS_MANAGER' then 60 when 'CUSTOMER_SUPPORT' then 40 when 'TELECALLER' then 20 when 'CEO' then 75 when 'CFO' then 75 when 'COO' then 65 else 0 end into tr from public.admin_roles r where r.id=t.role_id;
 if tr>=ar then raise exception 'You cannot act on an equal or higher role'; end if;
 old_row:=to_jsonb(t);
 update public.admin_users set status=p_status,updated_at=now() where id=p_admin_id returning to_jsonb(admin_users) into new_row;
 perform public.admin_append_audit('ADMIN_STATUS_CHANGED','admin_user',p_admin_id,old_row,new_row,p_reason);
 return new_row;
end $$;

create or replace function public.admin_revoke_user_sessions(p_target_user_id uuid) returns integer
language plpgsql security definer set search_path=public,auth as $$
declare a admin_users%rowtype;t admin_users%rowtype;role_code text;n int;
begin
 select * into a from public.admin_users where user_id=auth.uid() and status='active' limit 1;
 if a.id is null then raise exception 'Administrator access required'; end if;
 select r.code into role_code from public.admin_roles r where r.id=a.role_id;
 if role_code<>'SUPER_ADMIN' then raise exception 'Only SUPER_ADMIN may revoke administrator sessions'; end if;
 select * into t from public.admin_users where user_id=p_target_user_id limit 1;
 if t.id is null then raise exception 'Target administrator not found'; end if;
 select r.code into role_code from public.admin_roles r where r.id=t.role_id;
 if role_code='SUPER_ADMIN' then raise exception 'SUPER_ADMIN sessions cannot be revoked'; end if;
 if p_target_user_id=auth.uid() then raise exception 'Self session revocation is not permitted'; end if;
 delete from auth.refresh_tokens where session_id in(select id from auth.sessions where user_id=p_target_user_id);
 delete from auth.sessions where user_id=p_target_user_id;
 get diagnostics n=row_count;
 return n;
end $$;

-- Customer lifecycle, commercial override, role-access and admin-creation RPCs
-- are defined in the preceding Sprint 1 migrations and remain the only mutation paths.
