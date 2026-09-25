create or replace function public.get_admin_marketing_monthly()
returns table(month date, ad_spend numeric, leads bigint, conversions bigint, cac numeric)
language plpgsql stable security definer set search_path to 'public'
as $function$
begin
 if not public.is_admin_user() then raise exception 'admin access required'; end if;
 return query
 select date_trunc('month',pms.spend_date)::date,sum(pms.amount),sum(pms.leads)::bigint,sum(pms.conversions)::bigint,
 case when sum(pms.conversions)>0 then sum(pms.amount)/sum(pms.conversions) else null end
 from public.platform_marketing_spend as pms
 group by date_trunc('month',pms.spend_date) order by date_trunc('month',pms.spend_date);
end;$function$;