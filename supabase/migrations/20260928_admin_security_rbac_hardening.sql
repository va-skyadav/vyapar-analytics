-- Sprint 1: Admin security and authorization hardening
-- Permission-aware RLS for the Admin Control Plane.
-- Applied to the production Supabase project on 2026-09-28.

drop policy if exists admin_departments_access on public.admin_departments;
create policy admin_departments_access on public.admin_departments
for all to authenticated
using (public.has_admin_permission('organization.manage'))
with check (public.has_admin_permission('organization.manage'));

drop policy if exists admin_permissions_access on public.admin_permissions;
create policy admin_permissions_access on public.admin_permissions
for all to authenticated
using (public.has_admin_permission('roles.manage'))
with check (public.has_admin_permission('roles.manage'));

drop policy if exists admin_role_permissions_access on public.admin_role_permissions;
create policy admin_role_permissions_access on public.admin_role_permissions
for all to authenticated
using (public.has_admin_permission('roles.manage'))
with check (public.has_admin_permission('roles.manage'));

drop policy if exists admin_roles_access on public.admin_roles;
create policy admin_roles_access on public.admin_roles
for all to authenticated
using (public.has_admin_permission('roles.manage'))
with check (public.has_admin_permission('roles.manage'));

drop policy if exists admin_users_access on public.admin_users;
create policy admin_users_access on public.admin_users
for all to authenticated
using (public.has_admin_permission('organization.manage'))
with check (public.has_admin_permission('organization.manage'));

drop policy if exists "Admins can view businesses" on public.businesses;
create policy "Admins can view businesses" on public.businesses
for select to authenticated
using (public.has_admin_permission('customers.view'));

drop policy if exists "Admins can update businesses" on public.businesses;
create policy "Admins can update businesses" on public.businesses
for update to authenticated
using (
  public.has_admin_permission('customers.edit')
  or public.has_admin_permission('customers.suspend')
  or public.has_admin_permission('customers.offboard')
  or public.has_admin_permission('customers.onboard')
)
with check (
  public.has_admin_permission('customers.edit')
  or public.has_admin_permission('customers.suspend')
  or public.has_admin_permission('customers.offboard')
  or public.has_admin_permission('customers.onboard')
);

drop policy if exists "Admins can view business subscriptions" on public.business_subscriptions;
create policy "Admins can view business subscriptions" on public.business_subscriptions
for select to authenticated
using (public.has_admin_permission('subscriptions.view'));

drop policy if exists "Admins can update business subscriptions" on public.business_subscriptions;
create policy "Admins can update business subscriptions" on public.business_subscriptions
for update to authenticated
using (public.has_admin_permission('subscriptions.change_plan'))
with check (public.has_admin_permission('subscriptions.change_plan'));

drop policy if exists "Admins can view payments" on public.payments;
create policy "Admins can view payments" on public.payments
for select to authenticated
using (public.has_admin_permission('finance.view'));

drop policy if exists admin_feature_flags_modify on public.platform_feature_flags;
create policy admin_feature_flags_modify on public.platform_feature_flags
for all to authenticated
using (public.has_admin_permission('platform.manage'))
with check (public.has_admin_permission('platform.manage'));

drop policy if exists admin_feature_flags_select on public.platform_feature_flags;
create policy admin_feature_flags_select on public.platform_feature_flags
for select to authenticated
using (public.has_admin_permission('platform.manage'));

drop policy if exists admin_integrations_modify on public.platform_integrations;
create policy admin_integrations_modify on public.platform_integrations
for all to authenticated
using (public.has_admin_permission('platform.manage'))
with check (public.has_admin_permission('platform.manage'));

drop policy if exists admin_integrations_select on public.platform_integrations;
create policy admin_integrations_select on public.platform_integrations
for select to authenticated
using (public.has_admin_permission('platform.manage'));

drop policy if exists marketing_spend_access on public.platform_marketing_spend;
create policy marketing_spend_access on public.platform_marketing_spend
for all to authenticated
using (
  public.has_admin_permission('marketing.view')
  or public.has_admin_permission('marketing.manage')
)
with check (public.has_admin_permission('marketing.manage'));

drop policy if exists platform_settings_access on public.platform_settings;
create policy platform_settings_access on public.platform_settings
for all to authenticated
using (
  public.has_admin_permission('platform.manage')
  or public.has_admin_permission('branding.manage')
)
with check (
  public.has_admin_permission('platform.manage')
  or public.has_admin_permission('branding.manage')
);

drop policy if exists "admin manage subscription offer plans" on public.subscription_offer_plans;
create policy "admin manage subscription offer plans" on public.subscription_offer_plans
for all to authenticated
using (public.has_admin_permission('subscriptions.change_plan'))
with check (public.has_admin_permission('subscriptions.change_plan'));

drop policy if exists "admin manage subscription offers" on public.subscription_offers;
create policy "admin manage subscription offers" on public.subscription_offers
for all to authenticated
using (public.has_admin_permission('subscriptions.change_plan'))
with check (public.has_admin_permission('subscriptions.change_plan'));

drop policy if exists "admin manage subscription plan modules" on public.subscription_plan_modules;
create policy "admin manage subscription plan modules" on public.subscription_plan_modules
for all to authenticated
using (public.has_admin_permission('subscriptions.change_plan'))
with check (public.has_admin_permission('subscriptions.change_plan'));

drop policy if exists "Admins can view subscription plans" on public.subscription_plans;
create policy "Admins can view subscription plans" on public.subscription_plans
for select to authenticated
using (public.has_admin_permission('subscriptions.view'));

drop policy if exists "Admins can insert subscription plans" on public.subscription_plans;
create policy "Admins can insert subscription plans" on public.subscription_plans
for insert to authenticated
with check (public.has_admin_permission('subscriptions.change_plan'));

drop policy if exists "Admins can update subscription plans" on public.subscription_plans;
create policy "Admins can update subscription plans" on public.subscription_plans
for update to authenticated
using (public.has_admin_permission('subscriptions.change_plan'))
with check (public.has_admin_permission('subscriptions.change_plan'));

drop policy if exists "Admins can delete subscription plans" on public.subscription_plans;
create policy "Admins can delete subscription plans" on public.subscription_plans
for delete to authenticated
using (public.has_admin_permission('subscriptions.change_plan'));

drop policy if exists support_issues_access on public.support_issues;
create policy support_issues_access on public.support_issues
for all to authenticated
using (
  public.has_admin_permission('issues.view')
  or public.has_admin_permission('issues.manage')
)
with check (public.has_admin_permission('issues.manage'));
