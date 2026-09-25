"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import AdminShell from "../../components/admin-shell";
import {supabase} from "../../lib/supabase";
import {notifyAdminRefreshComplete,useAdminRefresh} from "../../lib/admin-refresh";

type Admin={id:string;user_id:string;email:string;display_name:string;status:string;role_id:string|null;department_id:string|null;created_at:string;role?:{code:string;name:string}|null;department?:{name:string}|null};
type Role={id:string;code:string;name:string;description:string|null;is_active:boolean};
type Dept={id:string;name:string;is_active:boolean};
type RoleRight={role_id:string;role_code:string;role_name:string;role_description:string|null;permission_id:string|null;permission_code:string|null;permission_name:string|null;module:string|null;action:string|null};

const responsibility:Record<string,string>={
 SUPER_ADMIN:"Full platform governance, security, administration and control.",
 TECHNICAL_ADMIN:"Platform technology, integrations, infrastructure and technical operations.",
 ANALYTICS_ADMIN:"Business analytics, reporting, dashboards and analytical operations.",
 FINANCE_ADMIN:"Platform billing, subscriptions, payments and finance operations.",
 OPERATIONS_MANAGER:"Customer operations, business processes and team coordination.",
 CUSTOMER_SUPPORT:"Customer issues, support workflows and permitted customer operations.",
 TELECALLER:"Customer onboarding, follow-up and permitted customer operations."
};

export default function Organization(){
 const [admins,setAdmins]=useState<Admin[]>([]);
 const [roles,setRoles]=useState<Role[]>([]);
 const [depts,setDepts]=useState<Dept[]>([]);
 const [rights,setRights]=useState<RoleRight[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [search,setSearch]=useState("");
 const [busyId,setBusyId]=useState("");
 const [showAdd,setShowAdd]=useState(false);
 const [form,setForm]=useState({display_name:"",email:"",role_id:"",department_id:""});
 const [saving,setSaving]=useState(false);
 const [selectedRole,setSelectedRole]=useState("");
 const [editingRole,setEditingRole]=useState<Role|null>(null);
 const [editDescription,setEditDescription]=useState("");
 const [editPermissions,setEditPermissions]=useState<string[]>([]);
 const [savingRole,setSavingRole]=useState(false);
 const [passwordAdmin,setPasswordAdmin]=useState<Admin|null>(null);
 const [newPassword,setNewPassword]=useState("");
 const [savingPassword,setSavingPassword]=useState(false);

 const load=useCallback(async(showLoading=true)=>{
  if(showLoading)setLoading(true);
  setError("");
  const s=supabase();
  const [a,r,d,p]=await Promise.all([
   s.rpc("get_admin_users_directory"),
   s.from("admin_roles").select("id,code,name,description,is_active").order("name"),
   s.from("admin_departments").select("id,name,is_active").order("name"),
   s.rpc("get_admin_role_rights")
  ]);
  if(a.error||r.error||d.error||p.error)setError(a.error?.message||r.error?.message||d.error?.message||p.error?.message||"Unable to load organization data");
  else{
   setAdmins((a.data||[]).map((x:any)=>({...x,role:x.role_code?{code:x.role_code,name:x.role_name}:null,department:x.department_name?{name:x.department_name}:null})));
   setRoles(r.data||[]);setDepts(d.data||[]);setRights(p.data||[]);
  }
  if(showLoading)setLoading(false);
  notifyAdminRefreshComplete();
 },[]);

 useEffect(()=>{void load()},[load]);
 useAdminRefresh(useCallback(()=>load(false),[load]));

 const activeAdmins=admins.filter(a=>a.status==="active").length;
 const suspendedAdmins=admins.length-activeAdmins;
 const activeRoles=roles.filter(r=>r.is_active).length;
 const activeDepts=depts.filter(d=>d.is_active).length;
 const filteredAdmins=useMemo(()=>{const q=search.trim().toLowerCase();if(!q)return admins;return admins.filter(a=>a.display_name.toLowerCase().includes(q)||a.email.toLowerCase().includes(q)||(a.role?.name||"").toLowerCase().includes(q)||(a.department?.name||"").toLowerCase().includes(q));},[admins,search]);
 const selectedRoleInfo=roles.find(r=>r.id===form.role_id);
 const selectedRoleRights=rights.filter(r=>r.role_id===form.role_id);
 const allPermissions=useMemo(()=>Array.from(new Map(rights.filter(r=>r.permission_id&&r.permission_code).map(r=>[r.permission_code!,{id:r.permission_id!,code:r.permission_code!,name:r.permission_name||r.permission_code!,module:r.module||"other",action:r.action||""}])).values()),[rights]);
 const resetForm=()=>setForm({display_name:"",email:"",role_id:"",department_id:""});
 const openRoleEditor=(role:Role)=>{
  setEditingRole(role);
  setEditDescription(role.description||"");
  setEditPermissions(rights.filter(x=>x.role_id===role.id).map(x=>x.permission_code).filter(Boolean) as string[]);
 };
 const togglePermission=(code:string)=>setEditPermissions(items=>items.includes(code)?items.filter(x=>x!==code):[...items,code]);
 const saveRoleAccess=async()=>{
  if(!editingRole)return;
  setSavingRole(true);setError("");
  const permissionIds=allPermissions.filter(p=>editPermissions.includes(p.code)).map(p=>p.id);
  const {error}=await supabase().rpc("admin_update_role_access",{p_role_id:editingRole.id,p_description:editDescription,p_permission_ids:permissionIds});
  if(error)setError(error.message);
  else{setEditingRole(null);await load(false);}
  setSavingRole(false);
 };

 const addUser=async()=>{
  if(!form.display_name.trim()||!form.email.trim()||!form.role_id){setError("Name, email and access role are required.");return;}
  setSaving(true);setError("");
  const s=supabase();
  const {data,error:invokeError}=await s.functions.invoke("create-admin-user",{body:{display_name:form.display_name.trim(),email:form.email.trim(),role_id:form.role_id,department_id:form.department_id||null}});
  if(invokeError||data?.error){setError(invokeError?.message||data?.error||"Unable to create administrator.");}
  else{resetForm();setShowAdd(false);await load(false);}
  setSaving(false);
 };

 const toggle=async(admin:Admin)=>{
  if(admin.role?.code==="SUPER_ADMIN"&&admin.status==="active"){setError("VA Super Admin is a protected account and cannot be suspended.");return;}
  setBusyId(admin.id);setError("");
  const next=admin.status==="active"?"suspended":"active";
  const s=supabase();
  const {data:user}=await s.auth.getUser();
  const {data:currentAdmin}=await s.from("admin_users").select("id").eq("user_id",user.user?.id||"").maybeSingle();
  if(!currentAdmin){setError("Current administrator could not be resolved.");setBusyId("");return;}
  const {error}=await s.from("admin_users").update({status:next}).eq("id",admin.id);
  if(error)setError(error.message);
  else{
   await s.from("admin_audit_logs").insert({admin_user_id:currentAdmin.id,action:next==="active"?"ADMIN_ACTIVATED":"ADMIN_SUSPENDED",entity_type:"admin_user",entity_id:admin.id,old_data:{status:admin.status},new_data:{status:next}});
   setAdmins(items=>items.map(item=>item.id===admin.id?{...item,status:next}:item));notifyAdminRefreshComplete();
  }
  setBusyId("");
 };

 const changePassword=async()=>{
  if(!passwordAdmin||newPassword.length<8){setError("Password must be at least 8 characters.");return;}
  setSavingPassword(true);setError("");
  const {data,error}=await supabase().functions.invoke("admin-change-password",{body:{target_user_id:passwordAdmin.user_id,password:newPassword}});
  if(error||data?.error)setError(data?.error||error?.message||"Unable to change password.");
  else{setPasswordAdmin(null);setNewPassword("");setError("Password changed successfully.");}
  setSavingPassword(false);
 };

 return <AdminShell active="/organization">
  {error&&<div className={error==="Password changed successfully."?"notice":"notice errorNotice"}>{error}</div>}
  {passwordAdmin&&<section className="card financePanel addAdminPanel roleEditorPanel">
   <div className="panelHeader"><div><div className="panelTitle">Change Administrator Password</div><div className="muted panelSubtitle">Direct password administration is available to VA Super Admin. No password-reset email or rate-limit wait is required.</div></div><button className="secondaryButton" onClick={()=>{setPasswordAdmin(null);setNewPassword("")}}>Close</button></div>
   <div className="roleEditorHeader"><strong>{passwordAdmin.display_name}</strong><span className="muted">{passwordAdmin.email}</span></div>
   <label>New password<input className="input" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Minimum 8 characters"/></label>
   <div className="addAdminActions"><button className="secondaryButton" onClick={()=>{setPasswordAdmin(null);setNewPassword("")}}>Cancel</button><button className="primaryButton" disabled={savingPassword} onClick={changePassword}>{savingPassword?"Changing...":"Change Password"}</button></div>
  </section>}
  {editingRole&&<section className="card financePanel addAdminPanel roleEditorPanel">
    <div className="panelHeader"><div><div className="panelTitle">Edit Role Rights & Responsibilities</div><div className="muted panelSubtitle">Only VA Super Admin can change the access profile used by administrators and Chief Executives.</div></div><button className="secondaryButton" onClick={()=>setEditingRole(null)}>Close</button></div>
    <div className="roleEditorHeader"><strong>{editingRole.name}</strong><span className="muted">{editingRole.code}</span></div>
    <label>Responsibilities / role definition<textarea className="input roleDescriptionInput" value={editDescription} onChange={e=>setEditDescription(e.target.value)} rows={3}/></label>
    <div className="permissionEditor"><div className="panelTitle">Allowed rights</div><div className="muted panelSubtitle">Select the minimum permissions this role should receive. Changes apply to every administrator assigned this role.</div>
     <div className="permissionGrid">{allPermissions.map(p=><label className="permissionItem" key={p.code}><input type="checkbox" checked={editPermissions.includes(p.code)} onChange={()=>togglePermission(p.code)}/><span><strong>{p.name}</strong><small>{p.code}</small></span></label>)}</div>
    </div>
    <div className="addAdminActions"><button className="secondaryButton" onClick={()=>setEditingRole(null)}>Cancel</button><button className="primaryButton" disabled={savingRole} onClick={saveRoleAccess}>{savingRole?"Saving...":"Save Rights & Responsibilities"}</button></div>
   </section>}
   {loading?<div className="card">Loading organization...</div>:<>
   <div className="organizationHero">
    <div><div className="sectionTitle">Organization & Access</div><div className="muted sectionSubtitle">Manage administrator access, roles, departments and platform rights.</div></div>
    <div className="organizationTools"><div className="organizationState"><span className="stateDot"/>{activeAdmins} active administrators</div><button className="primaryButton" onClick={()=>setShowAdd(v=>!v)}>{showAdd?"Close":"Add New User"}</button></div>
   </div>

   {showAdd&&<section className="card financePanel addAdminPanel">
    <div className="panelHeader"><div><div className="panelTitle">Add New Administrator</div><div className="muted panelSubtitle">Create the account and assign its administrative rights. An invitation will be emailed to the user.</div></div></div>
    <div className="addAdminGrid">
     <label>Full name<input className="input" value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} placeholder="e.g. Rahul Sharma"/></label>
     <label>Email<input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@company.com"/></label>
     <label>Access role<select className="input" value={form.role_id} onChange={e=>setForm({...form,role_id:e.target.value})}><option value="">Select role</option>{roles.filter(r=>r.is_active).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
     <label>Department<select className="input" value={form.department_id} onChange={e=>setForm({...form,department_id:e.target.value})}><option value="">Select department</option>{depts.filter(d=>d.is_active).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
    </div>
    {selectedRoleInfo&&<div className="roleInfoBox"><div><strong>{selectedRoleInfo.name}</strong><span>{responsibility[selectedRoleInfo.code]||selectedRoleInfo.description||"Administrative access profile."}</span></div><div className="roleRightsList">{selectedRoleRights.length?selectedRoleRights.map((r,i)=><span key={i}>{r.permission_name||r.permission_code}</span>):<span>No explicit permissions configured.</span>}</div></div>}
    <div className="addAdminActions"><button className="secondaryButton" onClick={()=>{resetForm();setShowAdd(false)}}>Cancel</button><button className="primaryButton" disabled={saving} onClick={addUser}>{saving?"Creating...":"Create & Send Invitation"}</button></div>
   </section>}

   <div className="statsRow organizationKpis">
    <div className="card"><div className="label">Admin Users</div><div className="value">{admins.length}</div><div className="kpiHint">Configured administrators</div></div>
    <div className="card"><div className="label">Active Admins</div><div className="value">{activeAdmins}</div><div className="kpiHint">{suspendedAdmins} suspended</div></div>
    <div className="card"><div className="label">Active Roles</div><div className="value">{activeRoles}</div><div className="kpiHint">{roles.length} configured</div></div>
    <div className="card"><div className="label">Departments</div><div className="value">{activeDepts}</div><div className="kpiHint">{depts.length} configured</div></div>
   </div>

   <section className="card financePanel organizationTeam">
    <div className="panelHeader"><div><div className="panelTitle">Administrator Access</div><div className="muted panelSubtitle">Email, role, department, account status and password controls.</div></div><div className="organizationTools"><span className="panelMeta">{filteredAdmins.length} of {admins.length}</span><input className="input organizationSearch" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search administrators..." /></div></div>
    <div className="tableWrap"><table><thead><tr><th>Administrator</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Access</th><th>Password</th></tr></thead><tbody>
     {filteredAdmins.map(admin=><tr key={admin.id}>
      <td><strong>{admin.display_name}</strong><div className="muted planCode">{admin.role?.code||"—"}</div></td>
      <td>{admin.email}</td><td>{admin.role?.name||"Unassigned"}</td><td>{admin.department?.name||"Unassigned"}</td>
      <td><span className={admin.status==="active"?"badge good":"badge"}>{admin.status.toUpperCase()}</span></td>
      <td>{admin.role?.code==="SUPER_ADMIN"?<span className="protectedLabel">Protected</span>:<button className="linkButton" disabled={busyId===admin.id} onClick={()=>toggle(admin)}>{busyId===admin.id?"Saving...":admin.status==="active"?"Suspend":"Activate"}</button>}</td>
      <td><button className="linkButton" onClick={()=>{setPasswordAdmin(admin);setNewPassword("");setError("")}}>Change Password</button></td>
     </tr>)}
    </tbody></table>{!filteredAdmins.length&&<div className="empty">{admins.length?"No administrators match the search.":"No admin users configured."}</div>}</div>
   </section>

   <section className="card financePanel roleReferencePanel">
    <div className="panelHeader"><div><div className="panelTitle">Administrative Role Reference</div><div className="muted panelSubtitle">Quick guide to the responsibility and effective rights associated with each access role.</div></div><span className="panelMeta">{activeRoles} active roles</span></div>
    <div className="tableWrap"><table><thead><tr><th>Role</th><th>Responsibilities</th><th>Configured Rights</th><th>Control</th></tr></thead><tbody>
     {roles.filter(r=>r.is_active).map(role=><tr key={role.id}><td><strong>{role.name}</strong><div className="muted planCode">{role.code}</div></td><td>{responsibility[role.code]||role.description||"Administrative responsibilities defined by assigned permissions."}</td><td>{rights.filter(x=>x.role_id===role.id).map(x=>x.permission_name||x.permission_code).filter(Boolean).join(" • ")||"No explicit permissions configured"}</td><td><button className="linkButton" onClick={()=>openRoleEditor(role)}>Edit Rights</button></td></tr>)}
    </tbody></table></div>
   </section>

   <div className="financeSectionGrid organizationLower">
    <section className="card financePanel"><div className="panelHeader"><div><div className="panelTitle">Access Roles</div><div className="muted panelSubtitle">Defined administrative access profiles. Chief Executive roles are managed here by VA Super Admin.</div></div><span className="panelMeta">{activeRoles} active</span></div>
     <div className="tableWrap"><table><thead><tr><th>Code</th><th>Role</th><th>Description</th><th>Status</th></tr></thead><tbody>{roles.map(role=><tr key={role.id}><td><strong>{role.code}</strong></td><td>{role.name}</td><td className="roleDescription">{role.description||"—"}</td><td><span className={role.is_active?"badge good":"badge"}>{role.is_active?"ACTIVE":"INACTIVE"}</span></td></tr>)}</tbody></table></div>
    </section>
    <section className="card financePanel"><div className="panelHeader"><div><div className="panelTitle">Departments</div><div className="muted panelSubtitle">Organizational ownership groups.</div></div><span className="panelMeta">{activeDepts} active</span></div>
     <div className="tableWrap"><table><thead><tr><th>Department</th><th>Status</th></tr></thead><tbody>{depts.map(dept=><tr key={dept.id}><td><strong>{dept.name}</strong></td><td><span className={dept.is_active?"badge good":"badge"}>{dept.is_active?"ACTIVE":"INACTIVE"}</span></td></tr>)}</tbody></table></div>
    </section>
   </div>
  </>}
 </AdminShell>;
}
