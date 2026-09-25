"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import AdminShell from "../../components/admin-shell";
import {supabase} from "../../lib/supabase";
import {notifyAdminRefreshComplete,useAdminRefresh} from "../../lib/admin-refresh";

type Growth={month:string;new_customers:number};
type Marketing={month:string;ad_spend:number;leads:number;conversions:number;cac:number|null};
type Plan={id:string;code:string;name:string;monthly_price:number;annual_price:number;currency_code:string;is_active:boolean};

const money=(value:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(value||0));
const monthLabel=(value:string)=>new Date(value).toLocaleDateString("en-IN",{month:"short",year:"numeric"});
const number=(value:number)=>Number(value||0).toLocaleString("en-IN");

export default function Finance(){
 const [growth,setGrowth]=useState<Growth[]>([]);
 const [marketing,setMarketing]=useState<Marketing[]>([]);
 const [plans,setPlans]=useState<Plan[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");

 const load=useCallback(async(showLoading=true)=>{
  if(showLoading)setLoading(true);
  setError("");
  const s=supabase();
  const [g,m,p]=await Promise.all([
   s.rpc("get_admin_customer_growth"),
   s.rpc("get_admin_marketing_monthly"),
   s.from("subscription_plans").select("id,code,name,monthly_price,annual_price,currency_code,is_active").order("monthly_price")
  ]);
  if(g.error||m.error||p.error)setError(g.error?.message||m.error?.message||p.error?.message||"Unable to load finance data");
  else{
   setGrowth(g.data||[]);
   setMarketing(m.data||[]);
   setPlans(p.data||[]);
  }
  if(showLoading)setLoading(false);
  notifyAdminRefreshComplete();
 },[]);

 useEffect(()=>{load()},[load]);
 useAdminRefresh(useCallback(()=>load(false),[load]));

 const totalCustomers=growth.reduce((sum,row)=>sum+Number(row.new_customers||0),0);
 const totalSpend=marketing.reduce((sum,row)=>sum+Number(row.ad_spend||0),0);
 const totalLeads=marketing.reduce((sum,row)=>sum+Number(row.leads||0),0);
 const totalConversions=marketing.reduce((sum,row)=>sum+Number(row.conversions||0),0);
 const blendedCac=totalConversions?totalSpend/totalConversions:null;
 const activePlans=plans.filter(plan=>plan.is_active).length;
 const maxGrowth=Math.max(...growth.map(row=>Number(row.new_customers||0)),1);
 const maxSpend=Math.max(...marketing.map(row=>Number(row.ad_spend||0)),1);
 const recentGrowth=useMemo(()=>[...growth].slice(-6),[growth]);
 const recentMarketing=useMemo(()=>[...marketing].slice(-6),[marketing]);

 return <AdminShell active="/finance">
  {error&&<div className="notice errorNotice">{error}</div>}
  {loading?<div className="card">Loading finance & growth...</div>:<>
   <div className="sectionHeading">
    <div>
     <div className="sectionTitle">Commercial Snapshot</div>
     <div className="muted sectionSubtitle">Acquisition, marketing efficiency and subscription catalogue.</div>
    </div>
   </div>

   <div className="statsRow financeKpis">
    <div className="card"><div className="label">New Customers</div><div className="value">{number(totalCustomers)}</div><div className="kpiHint">Last 12 months</div></div>
    <div className="card"><div className="label">Ad Spend</div><div className="value">{money(totalSpend)}</div><div className="kpiHint">Last 12 months</div></div>
    <div className="card"><div className="label">Leads</div><div className="value">{number(totalLeads)}</div><div className="kpiHint">Recorded leads</div></div>
    <div className="card"><div className="label">Conversions</div><div className="value">{number(totalConversions)}</div><div className="kpiHint">Recorded conversions</div></div>
    <div className="card"><div className="label">Blended CAC</div><div className="value">{blendedCac==null?"—":money(blendedCac)}</div><div className="kpiHint">Spend ÷ conversions</div></div>
    <div className="card"><div className="label">Active Plans</div><div className="value">{activePlans}</div><div className="kpiHint">Available for customers</div></div>
   </div>

   <div className="financeSectionGrid">
    <section className="card financePanel">
     <div className="panelHeader">
      <div><div className="panelTitle">Customer Growth</div><div className="muted panelSubtitle">New customers by month</div></div>
      <span className="panelMeta">{growth.length} months</span>
     </div>
     <div className="growthChart">
      {recentGrowth.map(row=><div className="growthItem" key={row.month}>
       <div className="growthBarTrack"><div className="growthBar" style={{height:`${Math.max((Number(row.new_customers||0)/maxGrowth)*100,Number(row.new_customers||0)?8:3)}%`}} /></div>
       <strong>{number(row.new_customers)}</strong>
       <span>{monthLabel(row.month)}</span>
      </div>)}
      {!recentGrowth.length&&<div className="empty">No customer growth history yet.</div>}
     </div>
     <div className="tableWrap compactTable"><table><thead><tr><th>Month</th><th>New Customers</th></tr></thead><tbody>
      {growth.map(row=><tr key={row.month}><td>{monthLabel(row.month)}</td><td><strong>{number(row.new_customers)}</strong></td></tr>)}
     </tbody></table>{!growth.length&&<div className="empty">No customer growth history yet.</div>}</div>
    </section>

    <section className="card financePanel">
     <div className="panelHeader">
      <div><div className="panelTitle">Marketing Performance</div><div className="muted panelSubtitle">Spend, leads, conversions and CAC</div></div>
      <span className="panelMeta">{marketing.length} months</span>
     </div>
     <div className="growthChart">
      {recentMarketing.map(row=><div className="growthItem marketingItem" key={row.month}>
       <div className="growthBarTrack"><div className="growthBar" style={{height:`${Math.max((Number(row.ad_spend||0)/maxSpend)*100,Number(row.ad_spend||0)?8:3)}%`}} /></div>
       <strong>{money(row.ad_spend)}</strong>
       <span>{monthLabel(row.month)}</span>
      </div>)}
      {!recentMarketing.length&&<div className="empty">No marketing performance history yet.</div>}
     </div>
     <div className="tableWrap compactTable"><table><thead><tr><th>Month</th><th>Spend</th><th>Leads</th><th>Conv.</th><th>CAC</th></tr></thead><tbody>
      {marketing.map(row=><tr key={row.month}><td>{monthLabel(row.month)}</td><td>{money(row.ad_spend)}</td><td>{number(row.leads)}</td><td>{number(row.conversions)}</td><td>{row.cac==null?"—":money(row.cac)}</td></tr>)}
     </tbody></table>{!marketing.length&&<div className="empty">No marketing performance history yet.</div>}</div>
    </section>
   </div>

   <section className="card financePanel plansPanel">
    <div className="panelHeader">
     <div><div className="panelTitle">Subscription Plans</div><div className="muted panelSubtitle">Current commercial catalogue and pricing</div></div>
     <span className="panelMeta">{activePlans} active</span>
    </div>
    <div className="tableWrap"><table><thead><tr><th>Plan</th><th>Monthly</th><th>Annual</th><th>Status</th></tr></thead><tbody>
     {plans.map(plan=><tr key={plan.id}><td><strong>{plan.name}</strong><div className="muted planCode">{plan.code}</div></td><td>{money(plan.monthly_price)}</td><td>{money(plan.annual_price)}</td><td><span className={plan.is_active?"badge good":"badge"}>{plan.is_active?"ACTIVE":"INACTIVE"}</span></td></tr>)}
    </tbody></table>{!plans.length&&<div className="empty">No subscription plans configured.</div>}</div>
   </section>
  </>}
 </AdminShell>;
}
