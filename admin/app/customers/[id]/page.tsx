"use client";
import {use,useEffect,useState} from "react";
import AdminShell from "../../../components/admin-shell";
import {supabase} from "../../../lib/supabase";
import {notifyAdminRefreshComplete,useAdminRefresh} from "../../../lib/admin-refresh";

type Data={business:any;owner:any;subscription:any;usage:any[];issues:any[];payments:any[]};
const money=(v:any)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v||0));
const fmt=(v:any)=>v?new Date(v).toLocaleString("en-IN"):"—";

export default function CustomerDetail({params}:{params:Promise<{id:string}>}){
 const {id}=use(params); const [data,setData]=useState<Data|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=async(showLoading=true)=>{if(showLoading)setLoading(true);const {data,error}=await supabase().rpc("get_admin_customer_360",{p_business_id:id});if(error)setError(error.message);else setData(data as Data);setLoading(false);notifyAdminRefreshComplete()};
 useEffect(()=>{load()},[id]);
 const setStatus=async(status:"ACTIVE"|"SUSPENDED"|"OFFBOARDED")=>{const reason=window.prompt("Reason (optional):")??null;const {error}=await supabase().rpc("admin_set_customer_lifecycle",{p_business_id:id,p_status:status,p_reason:reason});if(error)setError(error.message);else load()};
 if(loading)return <AdminShell active="/customers"><div className="card">Loading customer...</div></AdminShell>;
 if(error||!data)return <AdminShell active="/customers"><div className="notice">{error||"Customer not found"}</div><a className="linkButton" href="/customers">← Back to Customers</a></AdminShell>;
 const b=data.business,sub=data.subscription,owner=data.owner;
 return <AdminShell active="/customers"><div className="detailTop"><div><a className="backLink" href="/customers">← Customers</a><div className="title detailTitle">{b.name}</div><div className="muted">{b.legal_name||"Customer account"} · {b.lifecycle_status}</div></div><div className="actionButtons">{b.lifecycle_status!=="ACTIVE"&&<button className="button small" onClick={()=>setStatus("ACTIVE")}>Activate</button>}{b.lifecycle_status==="ACTIVE"&&<button className="button small secondaryButton" onClick={()=>setStatus("SUSPENDED")}>Suspend</button>}{b.lifecycle_status!=="OFFBOARDED"&&<button className="button small dangerButton" onClick={()=>setStatus("OFFBOARDED")}>Offboard</button>}</div></div>
 <div className="dashboardGrid detailStats"><Metric label="Status" value={b.lifecycle_status}/><Metric label="Plan" value={sub?.plan?.name||"No plan"}/><Metric label="Subscription" value={sub?.status||"None"}/><Metric label="Open Issues" value={String(data.issues.filter((x:any)=>["open","in_progress"].includes(x.status)).length)}/></div>
 <div className="twoCol">
  <section className="card"><div className="sectionTitle">Business Profile</div><Info label="Business" value={b.name}/><Info label="Legal name" value={b.legal_name}/><Info label="Business type" value={b.business_type}/><Info label="Industry" value={b.industry}/><Info label="Email" value={b.email}/><Info label="Phone" value={b.phone}/><Info label="Tax registration" value={b.tax_registration_number}/><Info label="Created" value={fmt(b.created_at)}/></section>
  <section className="card"><div className="sectionTitle">Owner & Subscription</div><Info label="Owner email" value={owner.email}/><Info label="Plan" value={sub?.plan?.name}/><Info label="Monthly price" value={sub?.plan?money(sub.plan.monthly_price):"—"}/><Info label="Status" value={sub?.status}/><Info label="Trial end" value={fmt(sub?.trial_end)}/><Info label="Current period end" value={fmt(sub?.current_period_end)}/><Info label="Cancel at period end" value={sub?.cancel_at_period_end?"Yes":"No"}/></section>
 </div>
 <div className="twoCol"><section className="card tableCard"><div className="sectionTitle">Usage</div>{data.usage.length?<table><thead><tr><th>Metric</th><th>Quantity</th><th>Period</th></tr></thead><tbody>{data.usage.map((x:any)=><tr key={x.metric+x.period_start}><td>{x.metric}</td><td>{Number(x.quantity).toLocaleString()}</td><td>{x.period_start} → {x.period_end}</td></tr>)}</tbody></table>:<div className="empty">No usage recorded.</div>}</section>
 <section className="card tableCard"><div className="sectionTitle">Payments</div>{data.payments.length?<table><thead><tr><th>Date</th><th>Amount</th><th>Type</th><th>Method</th></tr></thead><tbody>{data.payments.map((x:any)=><tr key={x.id}><td>{fmt(x.payment_date)}</td><td>{money(x.amount)}</td><td>{x.payment_type}</td><td>{x.payment_method}</td></tr>)}</tbody></table>:<div className="empty">No payments recorded.</div>}</section></div>
 <section className="card tableCard"><div className="sectionTitle">Support Issues</div>{data.issues.length?<table><thead><tr><th>Issue</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead><tbody>{data.issues.map((x:any)=><tr key={x.id}><td>{x.title}</td><td>{x.priority}</td><td>{x.status}</td><td>{fmt(x.created_at)}</td></tr>)}</tbody></table>:<div className="empty">No support issues for this customer.</div>}</section>
 </AdminShell>
}
function Metric({label,value}:{label:string;value:string}){return <div className="metricCard"><div className="label">{label}</div><div className="metricValue">{value}</div></div>}
function Info({label,value}:{label:string;value:any}){return <div className="infoRow"><span>{label}</span><strong>{value||"—"}</strong></div>}