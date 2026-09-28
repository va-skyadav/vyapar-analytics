-- Sprint 1 authorization correction.
begin;

create or replace function public.admin_create_admin_record(p_user_id uuid,p_display_name text,p_role_id uuid,p_department_id uuid default null,p_notification_status text default 'sent')
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.admin_users%rowtype; target_code text; id uuid; row jsonb;
begin
 select * into a from public.admin_users where user_id=auth.uid() and status='active' limit 1;
 if a.id is null then raise exception 'Administrator access required'; end if;
 if not public.has_admin_permission('organization.manage') then raise exception 'organization.manage permission required'; end if;
 select code into target_code from public.admin_roles where id=p_role_id and is_active;
 if target_code is null then raise exception 'Selected role is not active'; end if;
 if target_code='SUPER_ADMIN' and not exists(select 1 from public.admin_roles where id=a.role_id and code='SUPER_ADMIN') then raise exception 'Only SUPER_ADMIN can assign SUPER_ADMIN'; end if;
 if target_code<>'SUPER_ADMIN' and exists(select 1 from public.admin_role_permissions t where t.role_id=p_role_id and not exists(select 1 from public.admin_role_permissions o where o.role_id=a.role_id and o.permission_id=t.permission_id)) then raise exception 'Target role permissions must be a subset of your own permissions'; end if;
 insert into public.admin_users(user_id,display_name,role_id,department_id,status) values(p_user_id,p_display_name,p_role_id,p_department_id,'active') returning id,to_jsonb(admin_users) into id,row;
 row:=jsonb_set(row,'{notification_status}',to_jsonb(p_notification_status),true);
 perform public.admin_append_audit('ADMIN_USER_CREATED','admin_user',id,null,row,'Administrator created');
 return row;
end $$;

drop function if exists public.admin_record_password_change(uuid,uuid,text,text,integer);
create function public.admin_record_password_change(p_actor_user_id uuid,p_target_admin_id uuid,p_target_user_id uuid,p_target_email text,p_notification_status text,p_sessions_revoked integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare a public.admin_users%rowtype;
begin
 select * into a from public.admin_users where user_id=p_actor_user_id and status='active' limit 1;
 if a.id is null then raise exception 'Administrator access required'; end if;
 if not exists(select 1 from public.admin_roles where id=a.role_id and code='SUPER_ADMIN') then raise exception 'Only SUPER_ADMIN may record administrator password changes'; end if;
 if p_notification_status not in ('sent','failed','not_configured') then raise exception 'Invalid notification status'; end if;
 return public.admin_append_audit('ADMIN_PASSWORD_CHANGED','admin_user',p_target_admin_id,null,jsonb_build_object('target_user_id',p_target_user_id,'email',p_target_email,'notification_status',p_notification_status,'sessions_revoked',coalesce(p_sessions_revoked,0)),'Password changed by SUPER_ADMIN');
end $$;

create or replace function public.admin_record_admin_invitation_notification(p_actor_user_id uuid,p_admin_id uuid,p_notification_status text)
returns uuid language plpgsql security definer set search_path=public as $$
declare a public.admin_users%rowtype;
begin
 select * into a from public.admin_users where user_id=p_actor_user_id and status='active' limit 1;
 if a.id is null then raise exception 'Administrator access required'; end if;
 if not exists(select 1 from public.admin_roles where id=a.role_id and code='SUPER_ADMIN') then raise exception 'Only SUPER_ADMIN may record administrator invitation notification status'; end if;
 if p_notification_status not in ('sent','failed','not_configured') then raise exception 'Invalid notification status'; end if;
 return public.admin_append_audit('ADMIN_INVITATION_NOTIFICATION','admin_user',p_admin_id,null,jsonb_build_object('notification_status',p_notification_status),'Administrator invitation notification result');
end $$;

revoke execute on function public.admin_record_password_change(uuid,uuid,uuid,text,text,integer),public.admin_record_admin_invitation_notification(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_record_password_change(uuid,uuid,uuid,text,text,integer),public.admin_record_admin_invitation_notification(uuid,uuid,text) to service_role;

-- admin_update_role_access remains SUPER_ADMIN-only; organization.manage is not sufficient.
commit;