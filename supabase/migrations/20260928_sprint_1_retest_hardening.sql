-- Sprint 1 retest hardening: admin table policies/grants, default privileges, lifecycle permissions, function EXECUTE, discount governance.
-- Applied to production as migration 20260928_sprint_1_retest_hardening.

begin;
drop policy if exists admin_departments_access on public.admin_departments;
drop policy if exists admin_permissions_access on public.admin_permissions;
drop policy if exists admin_role_permissions_access on public.admin_role_permissions;
drop policy if exists admin_roles_access on public.admin_roles;
drop policy if exists admin_users_manage on public.admin_users;
drop policy if exists admin_users_delete on public.admin_users;

create policy admin_departments_select on public.admin_departments for select to authenticated using (public.has_admin_permission('organization.view'));
create policy admin_permissions_select on public.admin_permissions for select to authenticated using (public.has_admin_permission('organization.view'));
create policy admin_role_permissions_select on public.admin_role_permissions for select to authenticated using (public.has_admin_permission('organization.view'));
create policy admin_roles_select on public.admin_roles for select to authenticated using (public.has_admin_permission('organization.view'));

revoke all on table public.admin_users,public.admin_roles,public.admin_permissions,public.admin_role_permissions,public.admin_departments,public.admin_audit_logs,public.business_commercial_overrides from anon,authenticated;
grant select on table public.admin_users,public.admin_roles,public.admin_permissions,public.admin_role_permissions,public.admin_departments,public.admin_audit_logs,public.business_commercial_overrides to authenticated;
revoke truncate,references,trigger on table public.admin_users,public.admin_roles,public.admin_permissions,public.admin_role_permissions,public.admin_departments,public.admin_audit_logs,public.business_commercial_overrides from anon,authenticated;

alter default privileges for role postgres in schema public revoke select,insert,update,delete,truncate,references,trigger on tables from public,anon,authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public,anon,authenticated;

delete from public.admin_role_permissions where permission_id in (select id from public.admin_permissions where code in ('customers.suspend','customers.offboard'));
delete from public.admin_permissions where code in ('customers.suspend','customers.offboard');

revoke execute on function public.admin_append_audit(text,text,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.admin_append_audit(text,text,uuid,jsonb,jsonb,text) to service_role;
revoke execute on function public.admin_revoke_user_sessions(uuid) from public,anon,authenticated;
grant execute on function public.admin_revoke_user_sessions(uuid) to service_role;

revoke execute on function public.admin_create_admin_record(uuid,text,uuid,uuid) from public,anon;
revoke execute on function public.admin_set_admin_status(uuid,text,text) from public,anon;
revoke execute on function public.admin_set_commercial_override(uuid,text,numeric,text,date) from public,anon;
revoke execute on function public.admin_set_customer_lifecycle(uuid,text,text) from public,anon;
revoke execute on function public.admin_update_role_access(uuid,text,uuid[]) from public,anon;
revoke execute on function public.admin_save_billing_secret(text,text,text) from public,anon;
revoke execute on function public.get_admin_customer_360(uuid) from public,anon;
revoke execute on function public.get_admin_customer_growth() from public,anon;
revoke execute on function public.get_admin_dashboard_operational() from public,anon;
revoke execute on function public.get_admin_dashboard_summary() from public,anon;
revoke execute on function public.get_admin_marketing_monthly() from public,anon;
revoke execute on function public.get_admin_role_rights() from public,anon;
revoke execute on function public.get_admin_users_directory() from public,anon;
revoke execute on function public.get_my_admin_access() from public,anon;
grant execute on function public.admin_create_admin_record(uuid,text,uuid,uuid) to authenticated;
grant execute on function public.admin_set_admin_status(uuid,text,text) to authenticated;
grant execute on function public.admin_set_commercial_override(uuid,text,numeric,text,date) to authenticated;
grant execute on function public.admin_set_customer_lifecycle(uuid,text,text) to authenticated;
grant execute on function public.admin_update_role_access(uuid,text,uuid[]) to authenticated;
grant execute on function public.admin_save_billing_secret(text,text,text) to authenticated;
grant execute on function public.get_admin_customer_360(uuid) to authenticated;
grant execute on function public.get_admin_customer_growth() to authenticated;
grant execute on function public.get_admin_dashboard_operational() to authenticated;
grant execute on function public.get_admin_dashboard_summary() to authenticated;
grant execute on function public.get_admin_marketing_monthly() to authenticated;
grant execute on function public.get_admin_role_rights() to authenticated;
grant execute on function public.get_admin_users_directory() to authenticated;
grant execute on function public.get_my_admin_access() to authenticated;
revoke all on table vault.secrets from anon,authenticated;

create or replace function public.is_current_super_admin() returns boolean language sql stable security definer set search_path to public as $$
select exists(select 1 from public.admin_users au join public.admin_roles ar on ar.id=au.role_id where au.user_id=(select auth.uid()) and au.status='active' and ar.code='SUPER_ADMIN' and ar.is_active=true);
$$;
revoke execute on function public.is_current_super_admin() from public,anon;
grant execute on function public.is_current_super_admin() to authenticated;

drop policy if exists platform_settings_access on public.platform_settings;
create policy platform_settings_select on public.platform_settings for select to authenticated using ((key<>'max_fixed_discount' and (public.has_admin_permission('platform.manage') or public.has_admin_permission('branding.manage'))) or (key='max_fixed_discount' and public.is_current_super_admin()));
create policy platform_settings_insert on public.platform_settings for insert to authenticated with check ((key<>'max_fixed_discount' and public.has_admin_permission('platform.manage')) or (key='max_fixed_discount' and public.is_current_super_admin()));
create policy platform_settings_update on public.platform_settings for update to authenticated using ((key<>'max_fixed_discount' and public.has_admin_permission('platform.manage')) or (key='max_fixed_discount' and public.is_current_super_admin())) with check ((key<>'max_fixed_discount' and public.has_admin_permission('platform.manage')) or (key='max_fixed_discount' and public.is_current_super_admin()));
create policy platform_settings_delete on public.platform_settings for delete to authenticated using ((key<>'max_fixed_discount' and public.has_admin_permission('platform.manage')) or (key='max_fixed_discount' and public.is_current_super_admin()));

create or replace function public.guard_fixed_discount_ceiling() returns trigger language plpgsql security definer set search_path to public as $$
begin
 if coalesce(new.key,old.key)='max_fixed_discount' then
  if not public.is_current_super_admin() then raise exception 'Only SUPER_ADMIN may change max_fixed_discount'; end if;
  if coalesce(current_setting('app.admin_reason',true),'')='' then raise exception 'A mandatory reason is required to change max_fixed_discount'; end if;
 end if;
 return coalesce(new,old);
end; $$;
drop trigger if exists trg_guard_fixed_discount_ceiling on public.platform_settings;
create trigger trg_guard_fixed_discount_ceiling before insert or update or delete on public.platform_settings for each row execute function public.guard_fixed_discount_ceiling();

create or replace function public.admin_set_fixed_discount_ceiling(p_value numeric,p_reason text) returns jsonb language plpgsql security definer set search_path to public as $$
declare new_row jsonb;
begin
 if not public.is_current_super_admin() then raise exception 'Only SUPER_ADMIN may change fixed discount ceiling'; end if;
 if coalesce(trim(p_reason),'')='' then raise exception 'Reason is required'; end if;
 if p_value<0 or p_value>1000000000 then raise exception 'Invalid fixed discount ceiling'; end if;
 perform pg_catalog.set_config('app.admin_reason',trim(p_reason),true);
 insert into public.platform_settings(key,value,updated_at) values('max_fixed_discount',to_jsonb(p_value),now())
 on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at
 returning to_jsonb(platform_settings) into new_row;
 return new_row;
end; $$;
revoke execute on function public.admin_set_fixed_discount_ceiling(numeric,text) from public,anon;
grant execute on function public.admin_set_fixed_discount_ceiling(numeric,text) to authenticated;
commit;