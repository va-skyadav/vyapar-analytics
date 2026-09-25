"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import AdminShell from "../../components/admin-shell";
import {supabase} from "../../lib/supabase";
import {notifyAdminRefreshComplete,useAdminRefresh} from "../../lib/admin-refresh";

type Admin={id:string;user_id:string;display_name:string;status:string;role_id:string|null;department_id:string|null;created_at:string;role?:{code:string;name:string}|null;department?:{name:string}|null};
type Role={id:string;code:string;name:string;description:string|null;is_active:boolean};
type Dept={id:string;name:string;is_active:boolean};

export default function Organization(){
 const [admins,setAdmins]=useState<Admin[]>([]);
 const [roles,setRoles]=useState<Role[]>([]);
 const [depts,setDepts]=useState<Dept[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [search,setSearch]=useState("");
 const [busyId,setBusyId]=useState("");

 const load=useCallback(async(showLoading=true)=>{
  if(showLoading)setLoading(true);
  setError("");
  const s=supabase();
  const [a,r,d]=await Promise.all([
   s.from("admin_users").select("id,user_id,display_name,status,role_id,department_id,created_at,admin_roles(code,name),admin_departments(name)").order("created_at"),
   s.from("admin_roles").select("id,code,name,description,is_active").order("name"),
   s.from("admin_departments").select("id,name,is_active").order("name")
  ]);
  if(a.error||r.error||d.error)setError(a.error?.message||r.error?.message||d.error?.message||"Unable to load organization data");
  else{
   setAdmins((a.data||[]).map((x:any)=>({...x,role:x.admin_roles,department:x.admin_departments})));
   setRoles(r.data||[]);
   setDepts(d.data||[]);
  }
  if(showLoading)setLoading(false);
  notifyAdminRefreshComplete();
 },[]);

 useEffect(()=>{load()},[load]);
 useAdminRefresh(useCallback(()=>load(false),[load]));

 const activeAdmins=admins.filter(a=>a.status==="active").length;
 const suspendedAdmins=admins.length-activeAdmins;
 const activeRoles=roles.filter(r=>r.is_active).length;
 const activeDepts=depts.filter(d=>d.is_active).length;
 const filteredAdmins=useMemo(()=>{const q=search.trim().toLowerCase();if(!q)return admins;return admins.filter(a=>a.display_name.toLowerCase().includes(q)||a.user_id.toLowerCase().includes(q)||(a.role?.name||"").toLowerCase().includes(q)||(a.department?.name||"").toLowerCase().includes(q));},[admins,search]);

 const toggle=async(admin:Admin)=>{
  setBusyId(admin.id);setError("");
  const next=admin.status==="active"?"suspended":"active";
  const s=supabase();
  const {data:user}=await s.auth.getUser();
  const {data:currentAdmin}=await s.from("admin_users").select("id").eq("user_id",user.user?.id||"").maybeSingle();
  if(!currentAdmin){setError("Current administrator could not be resolved.");setBusyId("");return;}
  if(currentAdmin.id===admin.id&&next==="suspended"){setError("You cannot suspend your own administrator account.");setBusyId("");return;}
  const {error}=await s.from("admin_users").update({status:next}).eq("id",admin.id);
  if(error)setError(error.message);
  else{
   await s.from("admin_audit_logs").insert({admin_user_id:currentAdmin.id,action:next==="active"?"ADMIN_ACTIVATED":"ADMIN_SUSPENDED",entity_type:"admin_user",entity_id:admin.id,old_data:{status:admin.status},new_data:{status:next}});
   setAdmins(items=>items.map(item=>item.id===admin.id?{...item,status:next}:item));notifyAdminRefreshComplete();
  }
  setBusyId("");
 };

 return <AdminShell active="/organization">
  {error&&<div className="notice errorNotice">{error}</div>}
  {loading?<div className="card">Loading organization...</div>:<>
   <div className="organizationHero"><div><div className="sectionTitle">Organization & Access</div><div className="muted sectionSubtitle">Manage administrator access, roles and organizational ownership.</div></div><div className="organizationState"><span className="stateDot"/>{activeAdmins} active administrators</div></div>

   <div className="statsRow organizationKpis">
    <div className="card"><div className="label">Admin Users</div><div className="value">{admins.length}</div><div className="kpiHint">Configured administrators</div></div>
    <div className="card"><div className="label">Active Admins</div><div className="value">{activeAdmins}</div><div className="kpiHint">Currently active</div></div>
    <div className="card"><div className="label">Active Roles</div><div className="value">{activeRoles}</div><div className="kpiHint">{roles.length} configured</div></div>
    <div className="card"><div className="label">Departments</div><div className="value">{activeDepts}</div><div className="kpiHint">{depts.length} configured</div></div>
   </div>

   <section className="card financePanel organizationTeam">
    <div className="panelHeader">
     <div><div className="panelTitle">Administrator Access</div><div className="muted panelSubtitle">Review administrative users and activate or suspend access.</div></div>
     <div className="organizationTools"><span className="panelMeta">{filteredAdmins.length} of {admins.length}</span><input className="input organizationSearch" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search administrators..." /></div>
    </div>
    <div className="tableWrap"><table><thead><tr><th>Administrator</th><th>Role</th><th>Department</th><th>Status</th><th>Access</th></tr></thead><tbody>
     {filteredAdmins.map(admin=><tr key={admin.id}>
      <td><strong>{admin.display_name}</strong><div className="muted planCode">{admin.user_id}</div></td>
      <td>{admin.role?.name||"Unassigned"}</td>
      <td>{admin.department?.name||"Unassigned"}</td>
      <td><span className={admin.status==="active"?"badge good":"badge"}>{admin.status.toUpperCase()}</span></td>
      <td><button className="linkButton" disabled={busyId===admin.id} onClick={()=>toggle(admin)}>{busyId===admin.id?"Saving...":admin.status==="active"?"Suspend":"Activate"}</button></td>
     </tr>)}
    </tbody></table>{!filteredAdmins.length&&<div className="empty">{admins.length?"No administrators match the search.":"No admin users configured."}</div>}</div>
   </section>

   <div className="financeSectionGrid organizationLower">
    <section className="card financePanel">
     <div className="panelHeader"><div><div className="panelTitle">Access Roles</div><div className="muted panelSubtitle">Defined administrative access profiles.</div></div><span className="panelMeta">{activeRoles} active</span></div>
     <div className="tableWrap"><table><thead><tr><th>Code</th><th>Role</th><th>Description</th><th>Status</th></tr></thead><tbody>
      {roles.map(role=><tr key={role.id}><td><strong>{role.code}</strong></td><td>{role.name}</td><td className="roleDescription">{role.description||"—"}</td><td><span className={role.is_active?"badge good":"badge"}>{role.is_active?"ACTIVE":"INACTIVE"}</span></td></tr>)}
     </tbody></table>{!roles.length&&<div className="empty">No roles configured.</div>}</div>
    </section>

    <section className="card financePanel">
     <div className="panelHeader"><div><div className="panelTitle">Departments</div><div className="muted panelSubtitle">Organizational ownership groups</div></div><span className="panelMeta">{activeDepts} active</span></div>
     <div className="tableWrap"><table><thead><tr><th>Department</th><th>Status</th></tr></thead><tbody>
      {depts.map(dept=><tr key={dept.id}><td><strong>{dept.name}</strong></td><td><span className={dept.is_active?"badge good":"badge"}>{dept.is_active?"ACTIVE":"INACTIVE"}</span></td></tr>)}
     </tbody></table>{!depts.length&&<div className="empty">No departments configured.</div>}</div>
    </section>
   </div>
  </>}
 </AdminShell>;
}
