import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell, getBusinessContext } from "@/components/app-shell";

const money = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export default async function Dashboard() {
  const supabase = await createClient();
  const ctx = await getBusinessContext(supabase);
  if (!ctx) redirect("/create-business");

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString();

  const [
    { data: sales },
    { data: saleItems },
    { data: expenses },
    { data: purchases },
    { data: purchaseItems },
    { data: products }
  ] = await Promise.all([
    supabase.from("sales").select("id,total,amount_paid,sale_date,status").eq("business_id",ctx.business.id).gte("sale_date",sinceIso).eq("status","posted"),
    supabase.from("sale_items").select("product_id,quantity,unit_price,total").eq("business_id",ctx.business.id),
    supabase.from("expenses").select("amount,tax_amount,payment_status,expense_date").eq("business_id",ctx.business.id).gte("expense_date",sinceIso),
    supabase.from("purchases").select("id,total,amount_paid,purchase_date,status").eq("business_id",ctx.business.id).gte("purchase_date",sinceIso).eq("status","posted"),
    supabase.from("purchase_items").select("product_id,quantity,unit_cost,total").eq("business_id",ctx.business.id),
    supabase.from("products").select("id,name,purchase_price,opening_stock,is_active").eq("business_id",ctx.business.id).eq("is_service",false)
  ]);

  const revenue = (sales||[]).reduce((s,x)=>s+Number(x.total||0),0);
  const paidSales = (sales||[]).reduce((s,x)=>s+Number(x.amount_paid||0),0);
  const expensesTotal = (expenses||[]).reduce((s,x)=>s+Number(x.amount||0)+Number(x.tax_amount||0),0);
  const paidExpenses = (expenses||[]).filter(x=>x.payment_status==="paid").reduce((s,x)=>s+Number(x.amount||0)+Number(x.tax_amount||0),0);
  const purchaseTotal = (purchases||[]).reduce((s,x)=>s+Number(x.total||0),0);
  const paidPurchases = (purchases||[]).reduce((s,x)=>s+Number(x.amount_paid||0),0);
  const receivables = (sales||[]).reduce((s,x)=>s+Math.max(Number(x.total||0)-Number(x.amount_paid||0),0),0);
  const payables = (purchases||[]).reduce((s,x)=>s+Math.max(Number(x.total||0)-Number(x.amount_paid||0),0),0);

  const costByProduct = new Map<string,number>();
  (products||[]).forEach(p=>costByProduct.set(p.id,Number(p.purchase_price||0)));
  const grossProfit = (saleItems||[]).reduce((s,x)=>s+Number(x.total||0)-Number(x.quantity||0)*(costByProduct.get(x.product_id)||0),0);

  const purchasedQty = new Map<string,number>();
  (purchaseItems||[]).forEach(x=>purchasedQty.set(x.product_id,(purchasedQty.get(x.product_id)||0)+Number(x.quantity||0)));
  const soldQty = new Map<string,number>();
  (saleItems||[]).forEach(x=>soldQty.set(x.product_id,(soldQty.get(x.product_id)||0)+Number(x.quantity||0)));
  const inventoryValue = (products||[]).reduce((s,p)=>{
    const qty=Number(p.opening_stock||0)+(purchasedQty.get(p.id)||0)-(soldQty.get(p.id)||0);
    return s+Math.max(qty,0)*Number(p.purchase_price||0);
  },0);

  const cash = paidSales-paidPurchases-paidExpenses;
  const metrics = [
    ["Sales", String((sales||[]).length), "posted transactions, last 30 days"],
    ["Revenue", money(revenue), "posted sales, last 30 days"],
    ["Gross Profit", money(grossProfit), "sales less product purchase cost"],
    ["Expenses", money(expensesTotal), "recorded expenses, last 30 days"],
    ["Cash", money(cash), "paid sales less paid purchases and expenses"],
    ["Receivables", money(receivables), "unpaid posted sales, last 30 days"],
    ["Payables", money(payables), "unpaid posted purchases, last 30 days"],
    ["Inventory Value", money(inventoryValue), "current estimated stock at purchase cost"]
  ];

  return <AppShell businessName={ctx.business.name} title="Analytics"><section className="content">
    <div className="headerRow"><div><h2>Business overview</h2><p>Real metrics calculated from your business database. No sample or fabricated numbers.</p></div><div className="headerActions"><a className="action" href="/products">Products</a><a className="action" href="/customers">Customers</a><a className="action primary" href="/sales">Record sale</a></div></div>
    <div className="grid">{metrics.map(([label,value,caption])=><div className="card" key={label}><div className="metricLabel">{label}</div><div className="metricValue">{value}</div><div className="metricCaption">{caption}</div></div>)}</div>
    <div className="analyticsGrid">
      <div className="card"><h3>Data status</h3><p className="muted">{(sales?.length||0)+(expenses?.length||0)+(purchases?.length||0)+(products?.length||0) === 0 ? "No operating data exists yet. Add products, customers and sales to activate the analytics layer." : "Metrics above are calculated from recorded transactions and master data."}</p><div className="dataLinks"><a href="/products">Manage products →</a><a href="/customers">Manage customers →</a><a href="/sales">Record sales →</a></div></div>
      <div className="card"><h3>Recent sales</h3>{sales?.length ? <div className="tableWrap"><table><thead><tr><th>Date</th><th>Total</th><th>Paid</th></tr></thead><tbody>{sales.slice(0,8).map(s=><tr key={s.id}><td>{new Date(s.sale_date).toLocaleDateString("en-IN")}</td><td>{money(Number(s.total))}</td><td>{money(Number(s.amount_paid))}</td></tr>)}</tbody></table></div> : <div className="emptyInline">No posted sales in the last 30 days.</div>}</div>
    </div>
  </section></AppShell>;
}
