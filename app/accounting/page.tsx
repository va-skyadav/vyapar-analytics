import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell, getBusinessContext } from "@/components/app-shell";

const money=(v:number)=>`₹${Math.round(v).toLocaleString("en-IN")}`;

export default async function AccountingPage(){
 const supabase=await createClient();
 const ctx=await getBusinessContext(supabase);
 if(!ctx) redirect("/create-business");

 const since=new Date();
 since.setDate(since.getDate()-30);
 const sinceIso=since.toISOString();

 const [{data:sales},{data:purchases},{data:expenses}]=await Promise.all([
  supabase.from("sales").select("id,invoice_number,sale_date,total,amount_paid,payment_status,status").eq("business_id",ctx.business.id).gte("sale_date",sinceIso).eq("status","posted").order("sale_date",{ascending:false}).limit(10),
  supabase.from("purchases").select("id,purchase_date,total,amount_paid,payment_status,status").eq("business_id",ctx.business.id).gte("purchase_date",sinceIso).eq("status","posted").order("purchase_date",{ascending:false}).limit(10),
  supabase.from("expenses").select("id,description,expense_date,amount,tax_amount,payment_status").eq("business_id",ctx.business.id).gte("expense_date",sinceIso).order("expense_date",{ascending:false}).limit(10)
 ]);

 const revenue=(sales||[]).reduce((s,x)=>s+Number(x.total||0),0);
 const salesPaid=(sales||[]).reduce((s,x)=>s+Number(x.amount_paid||0),0);
 const purchaseTotal=(purchases||[]).reduce((s,x)=>s+Number(x.total||0),0);
 const purchasePaid=(purchases||[]).reduce((s,x)=>s+Number(x.amount_paid||0),0);
 const expenseTotal=(expenses||[]).reduce((s,x)=>s+Number(x.amount||0)+Number(x.tax_amount||0),0);
 const expensePaid=(expenses||[]).filter(x=>x.payment_status==="paid").reduce((s,x)=>s+Number(x.amount||0)+Number(x.tax_amount||0),0);
 const receivables=(sales||[]).reduce((s,x)=>s+Math.max(Number(x.total||0)-Number(x.amount_paid||0),0),0);
 const payables=(purchases||[]).reduce((s,x)=>s+Math.max(Number(x.total||0)-Number(x.amount_paid||0),0),0);
 const netCash=salesPaid-purchasePaid-expensePaid;

 return <AppShell businessName={ctx.business.name} title="Accounting">
  <section className="content">
   <div className="pageIntro">
    <div><h2>Accounting</h2><p>Understand money coming in, money going out and outstanding balances from recorded transactions.</p></div>
    <span className="period">Last 30 days</span>
   </div>

   <div className="grid">
    <div className="card metricCard"><div className="metricLabel">Sales</div><div className="metricValue">{money(revenue)}</div><div className="metricCaption">posted sales value</div></div>
    <div className="card metricCard"><div className="metricLabel">Purchases</div><div className="metricValue">{money(purchaseTotal)}</div><div className="metricCaption">posted purchase value</div></div>
    <div className="card metricCard"><div className="metricLabel">Expenses</div><div className="metricValue">{money(expenseTotal)}</div><div className="metricCaption">recorded expenses including tax</div></div>
    <div className="card metricCard"><div className="metricLabel">Net Cash Movement</div><div className="metricValue">{money(netCash)}</div><div className="metricCaption">paid sales − paid purchases − paid expenses</div></div>
   </div>

   <div className="grid accountingBalances">
    <div className="card metricCard"><div className="metricLabel">Receivables</div><div className="metricValue">{money(receivables)}</div><div className="metricCaption">unpaid portion of posted sales</div></div>
    <div className="card metricCard"><div className="metricLabel">Payables</div><div className="metricValue">{money(payables)}</div><div className="metricCaption">unpaid portion of posted purchases</div></div>
    <div className="card metricCard"><div className="metricLabel">Sales Collected</div><div className="metricValue">{money(salesPaid)}</div><div className="metricCaption">cash actually received</div></div>
    <div className="card metricCard"><div className="metricLabel">Expenses Paid</div><div className="metricValue">{money(expensePaid)}</div><div className="metricCaption">cash actually spent on expenses</div></div>
   </div>

   <div className="analyticsGrid">
    <div className="card tableCard">
     <h3>Recent sales</h3>
     {sales?.length?<div className="tableWrap"><table><thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead><tbody>
      {sales.map(s=><tr key={s.id}><td>{s.invoice_number||s.id.slice(0,8)}</td><td>{new Date(s.sale_date).toLocaleDateString("en-IN")}</td><td>{money(Number(s.total))}</td><td>{money(Number(s.amount_paid))}</td><td>{money(Math.max(Number(s.total)-Number(s.amount_paid),0))}</td></tr>)}
     </tbody></table></div>:<div className="emptyInline">No posted sales in the last 30 days.</div>}
    </div>
    <div className="card tableCard">
     <h3>Recent purchases</h3>
     {purchases?.length?<div className="tableWrap"><table><thead><tr><th>Date</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead><tbody>
      {purchases.map(p=><tr key={p.id}><td>{new Date(p.purchase_date).toLocaleDateString("en-IN")}</td><td>{money(Number(p.total))}</td><td>{money(Number(p.amount_paid))}</td><td>{money(Math.max(Number(p.total)-Number(p.amount_paid),0))}</td></tr>)}
     </tbody></table></div>:<div className="emptyInline">No posted purchases in the last 30 days.</div>}
    </div>
   </div>

   <div className="card tableCard accountingExpenseCard">
    <h3>Recent expenses</h3>
    {expenses?.length?<div className="tableWrap"><table><thead><tr><th>Description</th><th>Date</th><th>Amount</th><th>Tax</th><th>Total</th><th>Status</th></tr></thead><tbody>
     {expenses.map(e=><tr key={e.id}><td>{e.description||"Expense"}</td><td>{new Date(e.expense_date).toLocaleDateString("en-IN")}</td><td>{money(Number(e.amount))}</td><td>{money(Number(e.tax_amount))}</td><td>{money(Number(e.amount)+Number(e.tax_amount))}</td><td>{e.payment_status||"—"}</td></tr>)}
    </tbody></table></div>:<div className="emptyInline">No expenses recorded in the last 30 days.</div>}
   </div>

   <div className="card accountingNote">
    <h3>Accounting source</h3>
    <p className="muted">This page reads recorded sales, purchases and expenses. It does not invent balances or treat unpaid transactions as cash received.</p>
   </div>
  </section>
 </AppShell>;
}