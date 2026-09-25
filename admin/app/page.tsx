"use client";

import {useCallback,useEffect,useState} from "react";
import {supabase} from "../lib/supabase";
import {notifyAdminRefreshComplete,useAdminRefresh} from "../lib/admin-refresh";
import AdminShell from "../components/admin-shell";

type Metrics={total_customers:number;active_customers:number;trial_customers:number;cancelled_or_expired_subscriptions:number;mrr:number;arr:number;new_customers_this_month:number;marketing_spend_this_month:number;leads_this_month:number;conversions_this_month:number;cac_this_month:number|null;forecast_data_status:string};
type Ops={open_issues:number;urgent_issues:number;active_subscriptions:number;trial_subscriptions:number;expiring_trials_7d:number;cancelling_subscriptions:number;recent_customers:number;customers_last_30d:number};
type Growth={month:string;new_customers:number};
const money=(v:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v||0));

export default function Home(){
 const [metrics,setMetrics]=useState<Metrics|null>(null),[ops,setOps]=useState<Ops|null>(null),[growth,setGrowth]=useState<Growth[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async(showLoading=true)=>{
  if(showLoading)setLoading(true);setError("");
  const s=supabase();const {data:{user}}=await s.auth.getUser();if(!user){location.href="/login";return}
  const [summary,operational,growthData]=await Promise.all([s.rpc("get_admin_dashboard_summary"),s.rpc("get_admin_dashboard_operational"),s.rpc("get_admin_customer_growth")]);
  const err=summary.error||operational.error||growthData.error;
  if(err)setError(err.message);else{setMetrics(summary.data?.[0]??null);setOps(operational.data?.[0]??null);setGrowth(growthData.data??[])}
  setLoading(false);
 },[]);
 useEffect(()=>{load()},[load]);
 if(loading)return <AdminShell active="/"><div className="card">Loading dashboard...</div></AdminShell>;
 return <AdminShell active="/">
  {error&&<div className="notice errorNotice">{error}</div>}
  {metrics&&ops&&<>
   <div className="sectionTitle">Commercial Snapshot</div>
   <div className="dashboardGrid">
    <Metric label="MRR" value={money(metrics.mrr)} detail="Active subscriptions"/>
    <Metric label="ARR" value={money(metrics.arr)} detail="Annualized recurring revenue"/>
    <Metric label="Total Customers" value={metrics.total_customers.toLocaleString()} detail={metrics.active_customers.toLocaleString()+" active"}/>
    <Metric label="New This Month" value={metrics.new_customers_this_month.toLocaleString()} detail={ops.customers_last_30d.toLocaleString()+" in last 30 days"}/>
    <Metric label="Trial Customers" value={metrics.trial_customers.toLocaleString()} detail={ops.expiring_trials_7d.toLocaleString()+" trials ending in 7 days"} alert={ops.expiring_trials_7d>0}/>
    <Metric label="Open Issues" value={ops.open_issues.toLocaleString()} detail={ops.urgent_issues.toLocaleString()+" high/urgent"} alert={ops.urgent_issues>0}/>
    <Metric label="Ad Spend This Month" value={money(metrics.marketing_spend_this_month)} detail={metrics.leads_this_month.toLocaleString()+" leads"}/>
    <Metric label="CAC This Month" value={metrics.cac_this_month==null?"—":money(metrics.cac_this_month)} detail={metrics.conversions_this_month.toLocaleString()+" conversions"}/>
   </div>
   <div className="dashboardColumns">
    <section className="card"><div className="sectionTitle">Operational Health</div><div className="muted">Items requiring attention</div><div className="healthList">
     <HealthRow label="Active subscriptions" value={ops.active_subscriptions}/><HealthRow label="Trial subscriptions" value={ops.trial_subscriptions}/><HealthRow label="Trials expiring within 7 days" value={ops.expiring_trials_7d} warn/><HealthRow label="Subscriptions cancelling at period end" value={ops.cancelling_subscriptions} warn/><HealthRow label="Open support issues" value={ops.open_issues} warn/><HealthRow label="High / urgent issues" value={ops.urgent_issues} danger/>
    </div></section>
    <section className="card"><div className="sectionTitle">Growth & Forecast</div><div className={metrics.forecast_data_status==="available"?"forecastReady":"forecastWarning"}><strong>{metrics.forecast_data_status==="available"?"Forecast data ready":"Insufficient history"}</strong><div className="muted">Only actual customer and revenue history is used. No synthetic business metrics are generated.</div></div><div className="miniTable"><div className="miniTableHead"><span>Month</span><span>New customers</span></div>
     {growth.slice(-6).reverse().map(x=><div className="miniRow" key={x.month}><span>{new Date(x.month).toLocaleDateString("en-IN",{month:"short",year:"numeric"})}</span><strong>{Number(x.new_customers).toLocaleString()}</strong></div>)}{!growth.length&&<div className="empty">No customer growth history yet.</div>}
    </div></section>
   </div>
   
  </>}
 </AdminShell>
}
function Metric({label,value,detail,alert=false}:{label:string;value:string;detail:string;alert?:boolean}){return <div className={alert?"metricCard attention":"metricCard"}><div className="label">{label}</div><div className="metricValue">{value}</div><div className="metricDetail">{detail}</div></div>}
function HealthRow({label,value,warn=false,danger=false}:{label:string;value:number;warn?:boolean;danger?:boolean}){return <div className="healthRow"><span>{label}</span><strong className={danger&&value>0?"danger":warn&&value>0?"warning":""}>{value.toLocaleString()}</strong></div>}

