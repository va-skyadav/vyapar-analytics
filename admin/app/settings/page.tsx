"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import AdminShell from "../../components/admin-shell";
import {supabase} from "../../lib/supabase";
import {notifyAdminRefreshComplete,useAdminRefresh} from "../../lib/admin-refresh";

type Setting={id:string;key:string;value:any;updated_at:string};
type Flag={id:string;code:string;name:string;description:string|null;enabled:boolean};
type Integration={id:string;code:string;name:string;category:string;status:"connected"|"degraded"|"not_configured"|"disabled";description:string|null;last_checked_at:string|null};
type Perm={id:string;code:string;name:string;module:string;action:string};
type Audit={id:string;action:string;entity_type:string|null;entity_id:string|null;created_at:string};

const settingLabel=(key:string)=>({
 platform_name:"Platform Name",default_currency:"Default Currency",default_timezone:"Default Timezone",
 trial_period_days:"Trial Period (Days)",new_customer_registration:"New Customer Registration",
 maintenance_mode:"Maintenance Mode",maintenance_message:"Maintenance Message"
 } as Record<string,string>)[key]||key;

export default function Settings(){
 const [settings,setSettings]=useState<Setting[]>([]);
 const [flags,setFlags]=useState<Flag[]>([]);
 const [integrations,setIntegrations]=useState<Integration[]>([]);
 const [perms,setPerms]=useState<Perm[]>([]);
 const [audits,setAudits]=useState<Audit[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [query,setQuery]=useState("");
 const [saving,setSaving]=useState<string|null>(null);
 const [activeTab,setActiveTab]=useState("configuration");

 const load=useCallback(async(showLoading=true)=>{
  if(showLoading)setLoading(true); setError("");
  const s=supabase();
  const [a,f,i,p,l]=await Promise.all([
   s.from("platform_settings").select("id,key,value,updated_at").order("key"),
   s.from("platform_feature_flags").select("id,code,name,description,enabled").order("name"),
   s.from("platform_integrations").select("id,code,name,category,status,description,last_checked_at").order("category,name"),
   s.from("admin_permissions").select("id,code,name,module,action").order("module,code"),
   s.from("admin_audit_logs").select("id,action,entity_type,entity_id,created_at").order("created_at",{ascending:false}).limit(30)
  ]);
  const first=a.error||f.error||i.error||p.error||l.error;
  if(first)setError(first.message||"Unable to load platform controls");
  else{
   setSettings(a.data||[]);setFlags(f.data||[]);setIntegrations(i.data||[]);
   setPerms(p.data||[]);setAudits(l.data||[]);
  }
  if(showLoading)setLoading(false); notifyAdminRefreshComplete();
 },[]);

 useEffect(()=>{load()},[load]);
 useAdminRefresh(useCallback(()=>load(false),[load]));

 const activeFlags=flags.filter(f=>f.enabled).length;
 const healthyIntegrations=integrations.filter(i=>i.status==="connected").length;
 const maintenance=Boolean(settings.find(s=>s.key==="maintenance_mode")?.value);
 const filteredSettings=useMemo(()=>settings.filter(s=>settingLabel(s.key).toLowerCase().includes(query.toLowerCase())||s.key.toLowerCase().includes(query.toLowerCase())),[settings,query]);

 const adminAudit=async(action:string,entity_type:string,entity_id:string|null=null,old_data:any=null,new_data:any=null)=>{
  const s=supabase();
  const {data:userData}=await s.auth.getUser();
  if(!userData.user)return;
  const {data:admin}=await s.from("admin_users").select("id").eq("user_id",userData.user.id).maybeSingle();
  if(admin?.id) await s.from("admin_audit_logs").insert({admin_user_id:admin.id,action,entity_type,entity_id,old_data,new_data});
 };

 const saveSetting=async(setting:Setting)=>{
  setSaving(setting.id); setError("");
  const old=setting.value;
  const {data:userData}=await supabase().auth.getUser();
  const {data:admin}=userData.user?await supabase().from("admin_users").select("id").eq("user_id",userData.user.id).maybeSingle():{data:null};
  const payload:any={value:setting.value,updated_at:new Date().toISOString()};
  if(admin?.id)payload.updated_by=admin.id;
  const {error:e}=await supabase().from("platform_settings").update(payload).eq("id",setting.id);
  if(e)setError(e.message);else await adminAudit("PLATFORM_SETTING_UPDATED","platform_settings",setting.id,old,setting.value);
  setSaving(null); if(!e)notifyAdminRefreshComplete();
 };

 const toggleFlag=async(flag:Flag)=>{
  setSaving(flag.id);
  const next=!flag.enabled;
  const {error:e}=await supabase().from("platform_feature_flags").update({enabled:next,updated_at:new Date().toISOString()}).eq("id",flag.id);
  if(e)setError(e.message);else{setFlags(x=>x.map(v=>v.id===flag.id?{...v,enabled:next}:v));await adminAudit(next?"FEATURE_ENABLED":"FEATURE_DISABLED","platform_feature_flags",flag.id,{enabled:flag.enabled},{enabled:next});}
  setSaving(null);
 };

 const checkIntegration=async(item:Integration)=>{
  setSaving(item.id);
  const {error:e}=await supabase().from("platform_integrations").update({last_checked_at:new Date().toISOString()}).eq("id",item.id);
  if(e)setError(e.message);else{setIntegrations(x=>x.map(v=>v.id===item.id?{...v,last_checked_at:new Date().toISOString()}:v));await adminAudit("INTEGRATION_CHECKED","platform_integrations",item.id);}
  setSaving(null);
 };

 const updateSettingValue=(id:string,value:any)=>setSettings(x=>x.map(v=>v.id===id?{...v,value}:v));

 return <AdminShell active="/settings">
  {error&&<div className="notice errorNotice">{error}</div>}
  {loading?<div className="card">Loading platform controls...</div>:<>
   <div className="settingsHeaderBar"><div className="settingsTabs" role="tablist">
    <button className={activeTab==="configuration"?"settingsTab active":"settingsTab"} onClick={()=>setActiveTab("configuration")}>Platform Configuration</button>
    <button className={activeTab==="features"?"settingsTab active":"settingsTab"} onClick={()=>setActiveTab("features")}>Feature Management</button>
    <button className={activeTab==="integrations"?"settingsTab active":"settingsTab"} onClick={()=>setActiveTab("integrations")}>Integrations</button>
    <button className={activeTab==="security"?"settingsTab active":"settingsTab"} onClick={()=>setActiveTab("security")}>Access & Security</button>
    <button className={activeTab==="audit"?"settingsTab active":"settingsTab"} onClick={()=>setActiveTab("audit")}>Audit Log</button>
   </div><div className={maintenance?"platformState dangerState":"platformState"}><span className="stateDot"/>{maintenance?"Maintenance Mode":"Platform Operational"}</div></div>

   {activeTab==="configuration"&&<section className="card financePanel settingsTabPanel"><div className="panelHeader"><div><div className="panelTitle">Core Platform Configuration</div><div className="muted panelSubtitle">Structured controls stored in Supabase</div></div><div className="settingsSearch"><input className="input" placeholder="Search settings..." value={query} onChange={e=>setQuery(e.target.value)}/></div></div><div className="settingsControlGrid">{filteredSettings.map(s=><div className="settingControl" key={s.id}><div className="settingControlHead"><div><strong>{settingLabel(s.key)}</strong><span>{s.key}</span></div><button className="linkButton" disabled={saving===s.id} onClick={()=>saveSetting(s)}>{saving===s.id?"Saving...":"Save"}</button></div>{typeof s.value==="boolean"?<label className="switchRow"><input type="checkbox" checked={s.value} onChange={e=>updateSettingValue(s.id,e.target.checked)}/><span>{s.value?"Enabled":"Disabled"}</span></label>:<input className="input settingInput" value={typeof s.value==="string"?s.value:String(s.value)} onChange={e=>{let v:any=e.target.value;if(typeof s.value==="number")v=Number(v);updateSettingValue(s.id,v)}}/>}</div>)}</div></section>}

   {activeTab==="features"&&<section className="card financePanel settingsTabPanel"><div className="panelHeader"><div><div className="panelTitle">Feature Management</div><div className="muted panelSubtitle">Control platform modules and release availability.</div></div><span className="panelMeta">{activeFlags} enabled</span></div><div className="featureList">{flags.map(f=><div className="featureRow" key={f.id}><div><strong>{f.name}</strong><span>{f.description||f.code}</span></div><button className={f.enabled?"toggleButton on":"toggleButton"} disabled={saving===f.id} onClick={()=>toggleFlag(f)}><span/>{f.enabled?"ON":"OFF"}</button></div>)}</div></section>}

   {activeTab==="integrations"&&<section className="card financePanel settingsTabPanel"><div className="panelHeader"><div><div className="panelTitle">System Integrations</div><div className="muted panelSubtitle">Platform service connectivity and health.</div></div><span className="panelMeta">{healthyIntegrations} connected</span></div><div className="integrationList">{integrations.map(i=><div className="integrationRow" key={i.id}><div><strong>{i.name}</strong><span>{i.category} · {i.description||"No description"}</span></div><div className="integrationActions"><span className={"statusBadge "+i.status}>{i.status.replace("_"," ")}</span><button className="linkButton" disabled={saving===i.id} onClick={()=>checkIntegration(i)}>Check</button></div></div>)}</div></section>}

   {activeTab==="security"&&<section className="card financePanel settingsTabPanel"><div className="panelHeader"><div><div className="panelTitle">Access & Security</div><div className="muted panelSubtitle">Administrative permission inventory.</div></div><span className="panelMeta">{perms.length} permissions</span></div><div className="permissionGrid">{perms.map(p=><div className="permissionChip" key={p.id}><strong>{p.code}</strong><span>{p.module} · {p.action}</span></div>)}</div></section>}
   {activeTab==="audit"&&<section className="card financePanel settingsTabPanel auditPanel"><div className="panelHeader"><div><div className="panelTitle">Administrative Audit Log</div><div className="muted panelSubtitle">Recent platform configuration and access activity.</div></div><span className="panelMeta">{audits.length} events</span></div><div className="tableWrap settingsAuditTable"><table><thead><tr><th>Action</th><th>Entity</th><th>When</th></tr></thead><tbody>{audits.map(a=><tr key={a.id}><td><strong>{a.action}</strong></td><td>{a.entity_type||"—"}</td><td>{new Date(a.created_at).toLocaleString("en-IN")}</td></tr>)}</tbody></table>{!audits.length&&<div className="empty">No admin audit events yet.</div>}</div></section>}
  </>}
 </AdminShell>;
}