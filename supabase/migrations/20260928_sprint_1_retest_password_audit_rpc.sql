-- Sprint 1: password-change audit is recorded by a SECURITY DEFINER RPC.
begin;
create or replace function public.admin_record_password_change(p_target_admin_id uuid,p_target_user_id uuid,p_target_email text,p_notification_status text,p_sessions_revoked integer)
returns uuid language plpgsql security definer set search_path to public as $function$
declare v_actor admin_users%rowtype;
begin
 select * into v_actor from public.admin_users where user_id=auth.uid() and status='active' limit 1;
 if v_actor.id is null then raise exception 'Administrator access required'; end if;
 if not exists(select 1 from public.admin_roles r where r.id=v_actor.role_id and r.code='SUPER_ADMIN') then raise exception 'Only SUPER_ADMIN may record administrator password changes'; end if;
 if p_notification_status not in ('sent','failed','not_configured') then raise exception 'Invalid notification status'; end if;
 return public.admin_append_audit('ADMIN_PASSWORD_CHANGED','admin_user',p_target_admin_id,null,jsonb_build_object('target_user_id',p_target_user_id,'email',p_target_email,'notification_status',p_notification_status,'sessions_revoked',coalesce(p_sessions_revoked,0)),'Password changed by SUPER_ADMIN');
end; $function$;
revoke execute on function public.admin_record_password_change(uuid,uuid,text,text,integer) from public,anon;
grant execute on function public.admin_record_password_change(uuid,uuid,text,text,integer) to authenticated;
commit;