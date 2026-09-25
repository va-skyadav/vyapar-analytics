"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import AdminShell from "../../components/admin-shell";
import {supabase} from "../../lib/supabase";
import {notifyAdminRefreshComplete,useAdminRefresh} from "../../lib/admin-refresh";

type Setting={id:string;key:string;value:any;updated_at:string};
type Perm={id:string;code:string;module:string;action:string};
type Audit={id:string;action:string;entity_type:string|null;entity_id:string|null;created_at:string};

export default function Settings(){
 const [settings,setSettings]=useState<Setting[]>([]);
 const [perms,setPerms]=useState<Perm[]>([]);
 const [audits,setAudits]=useState<Audit[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");

 const load=useCallback(async(showLoading=true)=>{
  if(showLoading)setLoading(true);
  setError("");
  const s=supabase();
  const [a,p,l]=await Promise.all([
   s.from("platform_settings").select("id,key,value,updated_at").order("key"),
   s.from("admin_permissions").select("id,code,module,action").order("module,code"),
   s.from("admin_audit_logs").select("id,action,entity_type,entity_id,created_at").order("created_at",{ascending:false}).limit(25)
  ]);
  if(a.error||p.error||l.error)setError(a.error?.message||p.error?.message||l.error?.message||"Unable to load platform settings");
  else{
   setSettings(a.data||[]);
   setPerms(p.data||[]);
   setAudits(l.data||[]);
  }
  if(showLoading)setLoading(false);
  notifyAdminRefreshComplete();
 },[]);

 useEffect(()=>{load()},[load]);
 useAdminRefresh(useCallback(()=>load(false),[load]));

 const activeSettings=settings.length;
 const modules=new Set(perms.map(p=>p.module)).size;
 const recentAudits=audits.length;
 const activePermissions=perms.length;
 const [query,setQuery]=useState("");
 const filteredSettings=useMemo(()=>settings.filter(s=>s.key.toLowerCase().includes(query.toLowerCase())),[settings,query]);

 const save=async(setting:Setting)=>{
  const {error}=await supabase().from("platform_settings").update({value:setting.value}).eq("id",setting.id);
  if(error)setError(error.message);
  else{
   setSettings(items=>items.map(item=>item.id===setting.id?{...item,updated_at:new Date().toISOString()}:item));
   notifyAdminRefreshComplete();
  }
 };

 return <AdminShell active="/settings">
  {error&&<div className="notice errorNotice">{error}</div>}
  {loading?<div className="card">Loading settings...</div>:<>
   <div className="sectionHeading">
    <div>
     <div className="sectionTitle">Platform Snapshot</div>
     <div className="muted sectionSubtitle">Configuration, access permissions and administrative audit.</div>
    </div>
   </div>

   <div className="statsRow settingsKpis">
    <div className="card"><div className="label">Platform Settings</div><div className="value">{activeSettings}</div><div className="kpiHint">Configured controls</div></div>
    <div className="card"><div className="label">Permissions</div><div className="value">{activePermissions}</div><div className="kpiHint">Available access rules</div></div>
    <div className="card"><div className="label">Permission Modules</div><div className="value">{modules}</div><div className="kpiHint">Controlled platform areas</div></div>
    <div className="card"><div className="label">Recent Audit Events</div><div className="value">{recentAudits}</div><div className="kpiHint">Latest 25 records</div></div>
   </div>

   <section className="card financePanel settingsPanel">
    <div className="panelHeader">
     <div><div className="panelTitle">Platform Settings</div><div className="muted panelSubtitle">Manage system configuration values</div></div>
     <div className="settingsSearch"><input className="input" placeholder="Search settings..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
    </div>
    <div className="tableWrap settingsTable"><table><thead><tr><th>Setting</th><th>Value</th><th>Last Updated</th><th>Action</th></tr></thead><tbody>
     {filteredSettings.map(setting=><tr key={setting.id}>
      <td><strong>{setting.key}</strong></td>
      <td><input className="input inlineInput" value={JSON.stringify(setting.value)} onChange={e=>{try{const value=JSON.parse(e.target.value);setSettings(items=>items.map(item=>item.id===setting.id?{...item,value}:item))}catch{}}}/></td>
      <td>{new Date(setting.updated_at).toLocaleString("en-IN")}</td>
      <td><button className="linkButton" onClick={()=>save(setting)}>Save</button></td>
     </tr>)}
     </tbody></table>{!filteredSettings.length&&<div className="empty">No matching platform settings.</div>}</div>
   </section>

   <div className="financeSectionGrid settingsLower">
    <section className="card financePanel">
     <div className="panelHeader"><div><div className="panelTitle">Permissions</div><div className="muted panelSubtitle">Available administrative access rules</div></div><span className="panelMeta">{modules} modules</span></div>
     <div className="tableWrap settingsSubTable"><table><thead><tr><th>Code</th><th>Module</th><th>Action</th></tr></thead><tbody>
      {perms.map(permission=><tr key={permission.id}><td><strong>{permission.code}</strong></td><td>{permission.module}</td><td>{permission.action}</td></tr>)}
     </tbody></table>{!perms.length&&<div className="empty">No permissions configured.</div>}</div>
    </section>

    <section className="card financePanel">
     <div className="panelHeader"><div><div className="panelTitle">Recent Admin Audit</div><div className="muted panelSubtitle">Latest platform administration activity</div></div><span className="panelMeta">{recentAudits} shown</span></div>
     <div className="tableWrap settingsSubTable"><table><thead><tr><th>Action</th><th>Entity</th><th>When</th></tr></thead><tbody>
      {audits.map(audit=><tr key={audit.id}><td><strong>{audit.action}</strong></td><td>{audit.entity_type||"—"}</td><td>{new Date(audit.created_at).toLocaleString("en-IN")}</td></tr>)}
     </tbody></table>{!audits.length&&<div className="empty">No admin audit events yet.</div>}</div>
    </section>
   </div>
  </>}
 </AdminShell>;
}
