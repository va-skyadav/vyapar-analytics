"use client";

import {useCallback,useEffect,useState} from "react";
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
 const suspendedAdmins=admins.filter(a=>a.status!=="active").length;
 const activeRoles=roles.filter(r=>r.is_active).length;
 const activeDepts=depts.filter(d=>d.is_active).length;

 const toggle=async(admin:Admin)=>{
  const next=admin.status==="active"?"suspended":"active";
  const {error}=await supabase().from("admin_users").update({status:next}).eq("id",admin.id);
  if(error)setError(error.message);
  else{
   setAdmins(items=>items.map(item=>item.id===admin.id?{...item,status:next}:item));
   notifyAdminRefreshComplete();
  }
 };

 return <AdminShell active="/organization">
  {error&&<div className="notice errorNotice">{error}</div>}
  {loading?<div className="card">Loading organization...</div>:<>
   <div className="sectionHeading">
    <div>
     <div className="sectionTitle">Organization Snapshot</div>
     <div className="muted sectionSubtitle">Administrative access, roles and platform ownership.</div>
    </div>
   </div>

   <div className="statsRow organizationKpis">
    <div className="card"><div className="label">Admin Users</div><div className="value">{admins.length}</div><div className="kpiHint">Configured administrators</div></div>
    <div className="card"><div className="label">Active Admins</div><div className="value">{activeAdmins}</div><div className="kpiHint">Currently active</div></div>
    <div className="card"><div className="label">Roles</div><div className="value">{activeRoles}</div><div className="kpiHint">{roles.length} configured</div></div>
    <div className="card"><div className="label">Departments</div><div className="value">{activeDepts}</div><div className="kpiHint">{depts.length} configured</div></div>
   </div>

   <section className="card financePanel organizationTeam">
    <div className="panelHeader">
     <div><div className="panelTitle">Admin Team</div><div className="muted panelSubtitle">Administrative users, access role and organizational assignment</div></div>
     <span className="panelMeta">{suspendedAdmins} suspended</span>
    </div>
    <div className="tableWrap"><table><thead><tr><th>Administrator</th><th>Role</th><th>Department</th><th>Status</th><th>Access</th></tr></thead><tbody>
     {admins.map(admin=><tr key={admin.id}>
      <td><strong>{admin.display_name}</strong><div className="muted planCode">{admin.user_id}</div></td>
      <td>{admin.role?.name||"Unassigned"}</td>
      <td>{admin.department?.name||"Unassigned"}</td>
      <td><span className={admin.status==="active"?"badge good":"badge"}>{admin.status.toUpperCase()}</span></td>
      <td><button className="linkButton" onClick={()=>toggle(admin)}>{admin.status==="active"?"Suspend":"Activate"}</button></td>
     </tr>)}
    </tbody></table>{!admins.length&&<div className="empty">No admin users configured.</div>}</div>
   </section>

   <div className="financeSectionGrid organizationLower">
    <section className="card financePanel">
     <div className="panelHeader"><div><div className="panelTitle">Roles</div><div className="muted panelSubtitle">Administrative access profiles</div></div><span className="panelMeta">{activeRoles} active</span></div>
     <div className="tableWrap"><table><thead><tr><th>Code</th><th>Role</th><th>Status</th></tr></thead><tbody>
      {roles.map(role=><tr key={role.id}><td><strong>{role.code}</strong></td><td>{role.name}</td><td><span className={role.is_active?"badge good":"badge"}>{role.is_active?"ACTIVE":"INACTIVE"}</span></td></tr>)}
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
