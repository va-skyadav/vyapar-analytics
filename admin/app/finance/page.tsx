"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import AdminShell from "../../components/admin-shell";
import {supabase} from "../../lib/supabase";
import {notifyAdminRefreshComplete,useAdminRefresh} from "../../lib/admin-refresh";

type Growth={month:string;new_customers:number};
type Marketing={month:string;ad_spend:number;leads:number;conversions:number;cac:number|null};
type Plan={id:string;code:string;name:string;monthly_price:number;annual_price:number;currency_code:string;is_active:boolean};
const money=(v:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v||0));

export default function Finance(){
 const [growth,setGrowth]=useState<Growth[]>([]),[marketing,setMarketing]=useState<Marketing[]>([]),[plans,setPlans]=useState<Plan[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async(showLoading=true)=>{
  if(showLoading)setLoading(true);setError("");
  const s=supabase();
  const [g,m,p]=await Promise.all([
   s.rpc("get_admin_customer_growth"),
   s.rpc("get_admin_marketing_monthly"),
   s.from("subscription_plans").select("id,code,name,monthly_price,annual_price,currency_code,is_active").order("monthly_price")
  ]);
  if(g.error||m.error||p.error)setError(g.error?.message||m.error?.message||p.error?.message||"Unable to load finance data");
  else{setGrowth(g.data||[]);setMarketing(m.data||[]);setPlans(p.data||[])}
  if(showLoading)setLoading(false);notifyAdminRefreshComplete();
 },[]);
 useEffect(()=>{load()},[load]);
 useAdminRefresh(useCallback(()=>load(false),[load]));

 const totalCustomers=growth.reduce((a,x)=>a+Number(x.new_customers||0),0);
 const totalSpend=marketing.reduce((a,x)=>a+Number(x.ad_spend||0),0);
 const totalLeads=marketing.reduce((a,x)=>a+Number(x.leads||0),0);
 const totalConv=marketing.reduce((a,x)=>a+Number(x.conversions||0),0);
 const blendedCac=totalConv?totalSpend/totalConv:null;
 const activePlans=plans.filter(p=>p.is_active).length;

 return <AdminShell active="/finance">
  {error&&<div className="notice">{error}</div>}
  {loading?<div className="card">Loading finance & growth...</div>:<>
   <div className="sectionTitle">Commercial & Growth Snapshot</div>
   <div className="statsRow financeKpis">
    <div className="card"><div className="label">12M New Customers</div><div className="value">{totalCustomers.toLocaleString()}</div><div className="kpiHint">Customer acquisition</div></div>
    <div className="card"><div className="label">12M Ad Spend</div><div className="value">{money(totalSpend)}</div><div className="kpiHint">Marketing investment</div></div>
    <div className="card"><div className="label">12M Leads</div><div className="value">{totalLeads.toLocaleString()}</div><div className="kpiHint">Recorded leads</div></div>
    <div className="card"><div className="label">12M Conversions</div><div className="value">{totalConv.toLocaleString()}</div><div className="kpiHint">Recorded conversions</div></div>
    <div className="card"><div className="label">Blended CAC</div><div className="value">{blendedCac==null?"—":money(blendedCac)}</div><div className="kpiHint">Spend ÷ conversions</div></div>
    <div className="card"><div className="label">Active Plans</div><div className="value">{activePlans}</div><div className="kpiHint">Currently available</div></div>
   </div>

   <div className="twoCol financeTables">
    <section className="card tableCard"><div className="sectionTitle">Customer Growth</div><div className="muted tableSubtitle">Monthly new-customer acquisition from recorded business data.</div><table><thead><tr><th>Month</th><th>New Customers</th></tr></thead><tbody>{growth.map(x=><tr key={x.month}><td>{new Date(x.month).toLocaleDateString("en-IN",{month:"short",year:"numeric"})}</td><td><strong>{Number(x.new_customers).toLocaleString()}</strong></td></tr>)}</tbody></table>{!growth.length&&<div className="empty">No customer growth history yet.</div>}</section>
    <section className="card tableCard"><div className="sectionTitle">Marketing Performance</div><div className="muted tableSubtitle">Recorded spend, leads, conversions and acquisition cost.</div><table><thead><tr><th>Month</th><th>Spend</th><th>Leads</th><th>Conv.</th><th>CAC</th></tr></thead><tbody>{marketing.map(x=><tr key={x.month}><td>{new Date(x.month).toLocaleDateString("en-IN",{month:"short",year:"numeric"})}</td><td>{money(x.ad_spend)}</td><td>{Number(x.leads).toLocaleString()}</td><td>{Number(x.conversions).toLocaleString()}</td><td>{x.cac==null?"—":money(x.cac)}</td></tr>)}</tbody></table>{!marketing.length&&<div className="empty">No marketing performance history yet.</div>}</section>
   </div>

   <section className="card tableCard"><div className="sectionTitle">Subscription Plans</div><div className="muted tableSubtitle">Current plan catalogue and commercial pricing.</div><table><thead><tr><th>Plan</th><th>Monthly</th><th>Annual</th><th>Status</th></tr></thead><tbody>{plans.map(p=><tr key={p.id}><td><strong>{p.name}</strong><div className="muted">{p.code}</div></td><td>{money(p.monthly_price)}</td><td>{money(p.annual_price)}</td><td><span className={p.is_active?"badge good":"badge"}>{p.is_active?"ACTIVE":"INACTIVE"}</span></td></tr>)}</tbody></table>{!plans.length&&<div className="empty">No subscription plans configured.</div>}</section>
  </>}
 </AdminShell>
}
