-- Sprint 1: admin creation audit includes notification status.
begin;
drop function if exists public.admin_create_admin_record(uuid,text,uuid,uuid);
create function public.admin_create_admin_record(p_user_id uuid,p_display_name text,p_role_id uuid,p_department_id uuid default null,p_notification_status text default 'sent')
returns jsonb language plpgsql security definer set search_path to public as $function$
declare v_actor admin_users%rowtype;v_target_role text;v_id uuid;new_row jsonb;
begin
 select * into v_actor from public.admin_users where user_id=auth.uid() and status='active' limit 1;
 if v_actor.id is null then raise exception 'Administrator access required'; end if;
 if p_notification_status not in ('sent','failed','not_configured') then raise exception 'Invalid notification status'; end if;
 select code into v_target_role from public.admin_roles where id=p_role_id and is_active;
 if v_target_role is null then raise exception 'Selected role is not active'; end if;
 if v_target_role='SUPER_ADMIN' then
  if not exists(select 1 from public.admin_roles r where r.id=v_actor.role_id and r.code='SUPER_ADMIN') then raise exception 'Only SUPER_ADMIN can assign SUPER_ADMIN'; end if;
 else
  if exists(select 1 from public.admin_role_permissions target where target.role_id=p_role_id and not exists(select 1 from public.admin_role_permissions own where own.role_id=v_actor.role_id and own.permission_id=target.permission_id)) then raise exception 'Target role permissions must be a subset of your own permissions'; end if;
 end if;
 insert into public.admin_users(user_id,display_name,role_id,department_id,status) values(p_user_id,p_display_name,p_role_id,p_department_id,'active') returning id,to_jsonb(admin_users) into v_id,new_row;
 new_row:=jsonb_set(new_row,'{notification_status}',to_jsonb(p_notification_status),true);
 perform public.admin_append_audit('ADMIN_USER_CREATED','admin_user',v_id,null,new_row,'Administrator created');
 return new_row;
end; $function$;
revoke execute on function public.admin_create_admin_record(uuid,text,uuid,uuid,text) from public,anon;
grant execute on function public.admin_create_admin_record(uuid,text,uuid,uuid,text) to authenticated;
commit;