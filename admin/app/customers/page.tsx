"use client";
import {useEffect,useMemo,useState} from "react";
import AdminShell from "../../components/admin-shell";
import {supabase} from "../../lib/supabase";
import {notifyAdminRefreshComplete} from "../../lib/admin-refresh";

type Customer={id:string;name:string;legal_name:string|null;business_type:string|null;industry:string|null;email:string|null;phone:string|null;is_active:boolean;lifecycle_status:"ACTIVE"|"SUSPENDED"|"OFFBOARDED";created_at:string};
type Issue={id:string;business_id:string|null;title:string;priority:string;status:string;created_at:string};
type Override={business_id:string;discount_type:"percentage"|"fixed";discount_value:number;reason:string|null;valid_until:string|null;is_active:boolean};
type EditState={discount_type:"percentage"|"fixed";discount_value:string;reason:string;valid_until:string};

export default function Customers(){
 const [rows,setRows]=useState<Customer[]>([]),[issues,setIssues]=useState<Issue[]>([]),[overrides,setOverrides]=useState<Record<string,Override>>({}),[editing,setEditing]=useState<string|null>(null),[edit,setEdit]=useState<EditState>({discount_type:"percentage",discount_value:"",reason:"",valid_until:""}),[q,setQ]=useState(""),[filter,setFilter]=useState("ALL"),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=async(showLoading=true)=>{
  if(showLoading)setLoading(true);
  setError("");
  const client=supabase();
  const [businessesRes,issuesRes,overridesRes]=await Promise.all([
   client.from("businesses").select("id,name,legal_name,business_type,industry,email,phone,is_active,lifecycle_status,created_at").order("created_at",{ascending:false}),
   client.from("support_issues").select("id,business_id,title,priority,status,created_at").order("created_at",{ascending:false}).limit(20),
   client.from("business_commercial_overrides").select("business_id,discount_type,discount_value,reason,valid_until,is_active")
  ]);
  const firstError=businessesRes.error||issuesRes.error||overridesRes.error;
  if(firstError){
   setError(firstError.message||"Unable to load customer data");
  }else{
   setRows(businessesRes.data||[]);
   setIssues(issuesRes.data||[]);
   const overrideMap:Record<string,Override>={};
   (overridesRes.data||[]).forEach((override)=>{overrideMap[override.business_id]=override});
   setOverrides(overrideMap);
  }
  setLoading(false);
  notifyAdminRefreshComplete();
 };
 useEffect(()=>{load()},[]);
 const filtered=useMemo(()=>rows.filter(r=>(filter==="ALL"||r.lifecycle_status===filter)&&(!q||[r.name,r.legal_name,r.email,r.phone,r.industry].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()))),[rows,q,filter]);
 const setStatus=async(r:Customer,status:Customer["lifecycle_status"])=>{const reason=window.prompt("Reason (optional):")??null;const {data,error}=await supabase().rpc("admin_set_customer_lifecycle",{p_business_id:r.id,p_status:status,p_reason:reason});if(error){setError(error.message);return}setRows(x=>x.map(v=>v.id===r.id?{...v,lifecycle_status:status,is_active:status==="ACTIVE"}:v));};
 const startEdit=(r:Customer)=>{const o=overrides[r.id];setEditing(r.id);setEdit({discount_type:o?.discount_type||"percentage",discount_value:o?.discount_value!=null?String(o.discount_value):"",reason:o?.reason||"",valid_until:o?.valid_until||""})};
 const saveEdit=async(r:Customer)=>{setError("");const raw=Number(edit.discount_value);if(!Number.isFinite(raw)||raw<0||(edit.discount_type==="percentage"&&raw>100)){setError("Enter a valid discount value. Percentage must be between 0 and 100.");return}const payload={business_id:r.id,discount_type:edit.discount_type,discount_value:raw,reason:edit.reason.trim()||null,valid_until:edit.valid_until||null,is_active:raw>0};const {data,error}=await supabase().from("business_commercial_overrides").upsert(payload,{onConflict:"business_id"}).select("business_id,discount_type,discount_value,reason,valid_until,is_active").single();if(error){setError(error.message);return}setOverrides(x=>({...x,[r.id]:data as Override}));setEditing(null);};
 const active=rows.filter(x=>x.lifecycle_status==="ACTIVE").length, suspended=rows.filter(x=>x.lifecycle_status==="SUSPENDED").length, openIssues=issues.filter(x=>["open","in_progress"].includes(x.status)).length;
 return <AdminShell active="/customers">
  <div className="customerToolbar"><div className="customerSearch"><input className="input" placeholder="Search business, email, phone..." value={q} onChange={e=>setQ(e.target.value)}/></div><select className="select customerFilter" value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">All customers</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="OFFBOARDED">Offboarded</option></select></div>
  {error&&<div className="notice">{error}</div>}
  <div className="statsRow customerKpis"><div className="card"><div className="label">Customers</div><div className="value">{rows.length}</div></div><div className="card"><div className="label">Active</div><div className="value">{active}</div></div><div className="card"><div className="label">Suspended</div><div className="value">{suspended}</div></div><div className="card"><div className="label">Open Issues</div><div className="value">{openIssues}</div></div></div>
  <div className="card tableCard"><div className="sectionTitle">Customer Accounts</div>{loading?<div className="muted">Loading...</div>:<div className="tableWrap"><table><thead><tr><th>Business</th><th>Contact</th><th>Type</th><th>Discount</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{filtered.map(r=>{const o=overrides[r.id];const isEditing=editing===r.id;return <tr key={r.id}><td><a className="customerLink" href={"/customers/"+r.id}><strong>{r.name}</strong></a><div className="muted">{r.industry||r.legal_name||"—"}</div></td><td>{r.email||"—"}<div className="muted">{r.phone||"—"}</div></td><td>{r.business_type||"—"}</td><td>{isEditing?<div style={{display:"grid",gap:6,minWidth:190}}><div style={{display:"flex",gap:6}}><select className="select" value={edit.discount_type} onChange={e=>setEdit(v=>({...v,discount_type:e.target.value as EditState["discount_type"]}))}><option value="percentage">%</option><option value="fixed">₹</option></select><input className="input" type="number" min="0" max={edit.discount_type==="percentage"?100:undefined} step="0.01" placeholder="Value" value={edit.discount_value} onChange={e=>setEdit(v=>({...v,discount_value:e.target.value}))}/></div><input className="input" placeholder="Reason (optional)" value={edit.reason} onChange={e=>setEdit(v=>({...v,reason:e.target.value}))}/><input className="input" type="date" value={edit.valid_until} onChange={e=>setEdit(v=>({...v,valid_until:e.target.value}))}/></div>:o?.is_active&&Number(o.discount_value)>0?<><strong>{o.discount_type==="percentage"?o.discount_value+"%":"₹"+Number(o.discount_value).toLocaleString("en-IN")}</strong>{o.reason&&<div className="muted">{o.reason}</div>}{o.valid_until&&<div className="muted">Until {new Date(o.valid_until+"T00:00:00").toLocaleDateString("en-IN")}</div>}</>:"—"}</td><td><span className={r.lifecycle_status==="ACTIVE"?"badge good":r.lifecycle_status==="SUSPENDED"?"badge warningBadge":"badge"}>{r.lifecycle_status}</span></td><td>{new Date(r.created_at).toLocaleDateString("en-IN")}</td><td><div className="actionButtons">{isEditing?<><button className="linkButton" onClick={()=>saveEdit(r)}>Save</button><button className="linkButton" onClick={()=>setEditing(null)}>Cancel</button></>:<><a className="linkButton" href={"/customers/"+r.id}>View</a><button className="linkButton" onClick={()=>startEdit(r)}>Edit</button>{r.lifecycle_status!=="ACTIVE"&&<button className="linkButton" onClick={()=>setStatus(r,"ACTIVE")}>Activate</button>}{r.lifecycle_status==="ACTIVE"&&<button className="linkButton" onClick={()=>setStatus(r,"SUSPENDED")}>Suspend</button>}{r.lifecycle_status!=="OFFBOARDED"&&<button className="dangerLink" onClick={()=>setStatus(r,"OFFBOARDED")}>Offboard</button>}</>}</div></td></tr>})}</tbody></table>{!filtered.length&&<div className="empty">No customers match the current filter.</div>}</div>}</div>
  <div className="card tableCard"><div className="sectionTitle">Recent Support Issues</div>{issues.length?<div className="tableWrap"><table><thead><tr><th>Issue</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead><tbody>{issues.map(i=><tr key={i.id}><td>{i.title}</td><td>{i.priority}</td><td>{i.status}</td><td>{new Date(i.created_at).toLocaleDateString("en-IN")}</td></tr>)}</tbody></table></div>:<div className="empty">No support issues recorded.</div>}</div>
 </AdminShell>
}