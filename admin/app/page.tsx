"use client";

import {useCallback,useEffect,useState} from "react";
import {supabase} from "../lib/supabase";

type Metrics={total_customers:number;active_customers:number;trial_customers:number;cancelled_or_expired_subscriptions:number;mrr:number;arr:number;new_customers_this_month:number;marketing_spend_this_month:number;leads_this_month:number;conversions_this_month:number;cac_this_month:number|null;forecast_data_status:string};
type Ops={open_issues:number;urgent_issues:number;active_subscriptions:number;trial_subscriptions:number;expiring_trials_7d:number;cancelling_subscriptions:number;recent_customers:number;customers_last_30d:number};
type Growth={month:string;new_customers:number};
const money=(v:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v||0));

export default function Home(){
 const [metrics,setMetrics]=useState<Metrics|null>(null),[ops,setOps]=useState<Ops|null>(null),[growth,setGrowth]=useState<Growth[]>([]);
 const [loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState(""),[lastUpdated,setLastUpdated]=useState<Date|null>(null);
 const load=useCallback(async(first=false)=>{
  first?setLoading(true):setRefreshing(true);setError("");
  const s=supabase();const {data:{user}}=await s.auth.getUser();if(!user){location.href="/login";return}
  const [summary,operational,growthData]=await Promise.all([s.rpc("get_admin_dashboard_summary"),s.rpc("get_admin_dashboard_operational"),s.rpc("get_admin_customer_growth")]);
  const err=summary.error||operational.error||growthData.error;
  if(err)setError(err.message);else{setMetrics(summary.data?.[0]??null);setOps(operational.data?.[0]??null);setGrowth(growthData.data??[]);setLastUpdated(new Date())}
  setLoading(false);setRefreshing(false);
 },[]);
 useEffect(()=>{load(true)},[load]);
 const logout=async()=>{await supabase().auth.signOut();location.href="/login"};
 if(loading)return <AdminLayout logout={logout}><div className="card">Loading dashboard...</div></AdminLayout>;
 return <AdminLayout logout={logout}>
  <div className="dashboardHeader"><div><div className="title">Admin Dashboard</div><div className="muted">Business and platform control center</div></div><div className="headerActions"><button className="secondaryButton" onClick={()=>load(false)} disabled={refreshing}>{refreshing?"Refreshing...":"Refresh"}</button><span className="muted smallText">{lastUpdated?"Updated "+lastUpdated.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):""}</span></div></div>
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
   <div className="sectionTitle actionTitle">Quick Actions</div><div className="quickActions">
    <Action href="/customers" title="Manage Customers" text="Search, activate or deactivate accounts"/><Action href="/finance" title="Finance & Growth" text="Review plans, acquisition and commercial metrics"/><Action href="/organization" title="Organization" text="Manage admin users, roles and departments"/><Action href="/settings" title="Settings & Platform" text="Review permissions, settings and audit events"/>
   </div>
  </>}
 </AdminLayout>
}
function Metric({label,value,detail,alert=false}:{label:string;value:string;detail:string;alert?:boolean}){return <div className={alert?"metricCard attention":"metricCard"}><div className="label">{label}</div><div className="metricValue">{value}</div><div className="metricDetail">{detail}</div></div>}
function HealthRow({label,value,warn=false,danger=false}:{label:string;value:number;warn?:boolean;danger?:boolean}){return <div className="healthRow"><span>{label}</span><strong className={danger&&value>0?"danger":warn&&value>0?"warning":""}>{value.toLocaleString()}</strong></div>}
function Action({href,title,text}:{href:string;title:string;text:string}){return <a className="actionCard" href={href}><strong>{title}</strong><span>{text}</span><b>→</b></a>}
function AdminLayout({children,logout}:{children:React.ReactNode;logout:()=>void}){return <div className="shell"><aside className="sidebar"><div className="brand">Vyapar Analytics</div><nav className="nav"><a className="active" href="/">Dashboard</a><a href="/customers">Customers</a><a href="/finance">Finance & Growth</a><a href="/organization">Organization</a><a href="/settings">Settings & Platform</a></nav></aside><main className="main"><div className="top"><div></div><button className="button topButton" onClick={logout}>Sign out</button></div>{children}</main></div>}