create or replace function public.get_admin_dashboard_operational()
returns table(open_issues bigint,urgent_issues bigint,active_subscriptions bigint,trial_subscriptions bigint,expiring_trials_7d bigint,cancelling_subscriptions bigint,recent_customers bigint,customers_last_30d bigint)
language plpgsql stable security definer set search_path to 'public'
as $function$
begin
 if not public.is_admin_user() then raise exception 'admin access required'; end if;
 return query select
 (select count(*) from public.support_issues si where si.status in ('open','in_progress')),
 (select count(*) from public.support_issues si where si.status in ('open','in_progress') and si.priority in ('urgent','high')),
 (select count(*) from public.business_subscriptions bs where bs.status='active'),
 (select count(*) from public.business_subscriptions bs where bs.status='trialing'),
 (select count(*) from public.business_subscriptions bs where bs.status='trialing' and bs.trial_end is not null and bs.trial_end>=now() and bs.trial_end<now()+interval '7 days'),
 (select count(*) from public.business_subscriptions bs where bs.status='active' and bs.cancel_at_period_end=true'),
 (select count(*) from public.businesses b where b.created_at>=now()-interval '7 days'),
 (select count(*) from public.businesses b where b.created_at>=now()-interval '30 days');
end;$function$;