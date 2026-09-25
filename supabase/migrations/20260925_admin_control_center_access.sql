-- Admin Control Center: allow authenticated admin users to operate the customer/commercial tables.
create policy "Admins can view businesses" on public.businesses for select to authenticated using ((select is_admin_user()));
create policy "Admins can update businesses" on public.businesses for update to authenticated using ((select is_admin_user())) with check ((select is_admin_user()));
create policy "Admins can view business members" on public.business_members for select to authenticated using ((select is_admin_user()));
create policy "Admins can update business members" on public.business_members for update to authenticated using ((select is_admin_user())) with check ((select is_admin_user()));
create policy "Admins can view business subscriptions" on public.business_subscriptions for select to authenticated using ((select is_admin_user()));
create policy "Admins can update business subscriptions" on public.business_subscriptions for update to authenticated using ((select is_admin_user())) with check ((select is_admin_user()));
create policy "Admins can view usage counters" on public.usage_counters for select to authenticated using ((select is_admin_user()));
create policy "Admins can update usage counters" on public.usage_counters for update to authenticated using ((select is_admin_user())) with check ((select is_admin_user()));
create policy "Admins can view payments" on public.payments for select to authenticated using ((select is_admin_user()));
create policy "Admins can view subscription plans" on public.subscription_plans for select to authenticated using ((select is_admin_user()));
create policy "Admins can insert subscription plans" on public.subscription_plans for insert to authenticated with check ((select is_admin_user()));
create policy "Admins can update subscription plans" on public.subscription_plans for update to authenticated using ((select is_admin_user())) with check ((select is_admin_user()));
create policy "Admins can delete subscription plans" on public.subscription_plans for delete to authenticated using ((select is_admin_user()));