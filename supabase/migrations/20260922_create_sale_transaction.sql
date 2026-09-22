create or replace function public.create_sale(
  p_business_id uuid,
  p_product_id uuid,
  p_customer_id uuid default null,
  p_quantity numeric default 1,
  p_unit_price numeric default null,
  p_sale_date timestamptz default now(),
  p_amount_paid numeric default 0
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_product public.products;
  v_sale public.sales;
  v_unit_price numeric;
  v_subtotal numeric;
  v_total numeric;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not private.is_business_member(p_business_id) then
    raise exception 'Business access denied';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
    and business_id = p_business_id
    and is_active = true;

  if not found then
    raise exception 'Product not found';
  end if;

  if p_customer_id is not null and not exists (
    select 1 from public.customers
    where id = p_customer_id
      and business_id = p_business_id
      and is_active = true
  ) then
    raise exception 'Customer not found';
  end if;

  v_unit_price := coalesce(p_unit_price, v_product.selling_price, 0);
  v_subtotal := round(p_quantity * v_unit_price, 2);
  v_total := v_subtotal;

  if coalesce(p_amount_paid, 0) < 0 or coalesce(p_amount_paid, 0) > v_total then
    raise exception 'Amount paid must be between zero and total';
  end if;

  insert into public.sales (
    business_id, customer_id, invoice_number, sale_date, status,
    subtotal, discount, tax, total, amount_paid, payment_status, created_by
  )
  values (
    p_business_id, p_customer_id,
    'INV-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'),
    p_sale_date, 'posted',
    v_subtotal, 0, 0, v_total, coalesce(p_amount_paid, 0),
    case
      when coalesce(p_amount_paid, 0) = 0 then 'unpaid'
      when coalesce(p_amount_paid, 0) >= v_total then 'paid'
      else 'partial'
    end,
    v_user_id
  )
  returning * into v_sale;

  insert into public.sale_items (
    business_id, sale_id, product_id, quantity, unit_price, discount, tax, total
  )
  values (
    p_business_id, v_sale.id, p_product_id, p_quantity, v_unit_price, 0, 0, v_total
  );

  return v_sale;
end;
$function$;

revoke execute on function public.create_sale(uuid, uuid, uuid, numeric, numeric, timestamptz, numeric) from public;
revoke execute on function public.create_sale(uuid, uuid, uuid, numeric, numeric, timestamptz, numeric) from anon;
grant execute on function public.create_sale(uuid, uuid, uuid, numeric, numeric, timestamptz, numeric) to authenticated;
