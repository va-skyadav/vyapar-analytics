-- Sprint 1: make platform mutation audits carry a transaction-local mandatory reason.
begin;
create or replace function public.audit_platform_mutation() returns trigger language plpgsql security definer set search_path to public as $function$
declare v_reason text;
begin
 v_reason:=nullif(current_setting('app.admin_reason',true),'');
 perform public.admin_append_audit(tg_op||'_'||tg_table_name,tg_table_name,coalesce(case when tg_op='DELETE' then old.id else new.id end,null),case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end,v_reason);
 return coalesce(new,old);
end; $function$;
create or replace function public.admin_set_fixed_discount_ceiling(p_value numeric,p_reason text) returns jsonb language plpgsql security definer set search_path to public as $$
declare new_row jsonb;
begin
 if not public.is_current_super_admin() then raise exception 'Only SUPER_ADMIN may change fixed discount ceiling'; end if;
 if coalesce(trim(p_reason),'')='' then raise exception 'Reason is required'; end if;
 if p_value<0 or p_value>1000000000 then raise exception 'Invalid fixed discount ceiling'; end if;
 perform pg_catalog.set_config('app.admin_reason',trim(p_reason),true);
 insert into public.platform_settings(key,value,updated_at) values('max_fixed_discount',to_jsonb(p_value),now()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at returning to_jsonb(platform_settings) into new_row;
 return new_row;
end; $$;
commit;