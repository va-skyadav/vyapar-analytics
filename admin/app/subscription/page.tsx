"use client";

import {useCallback,useEffect,useState} from "react";
import AdminShell from "../../components/admin-shell";
import {supabase} from "../../lib/supabase";
import {notifyAdminRefreshComplete,useAdminRefresh} from "../../lib/admin-refresh";

type Plan={id:string;code:string;name:string;monthly_price:number;annual_price:number;currency_code:string;limits:any;features:any;is_active:boolean;description?:string|null};

export default function Subscription(){
 const [plans,setPlans]=useState<Plan[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [saving,setSaving]=useState<string|null>(null);
 const [editingPlan,setEditingPlan]=useState<Plan|null>(null);
 const [planForm,setPlanForm]=useState({name:"",monthly_price:"",annual_price:"",currency_code:"INR",is_active:true,description:"",limits:"{}",features:"{}"});

 const load=useCallback(async(showLoading=true)=>{
  if(showLoading)setLoading(true);
  setError("");
  const s=supabase();
  const {data,error:e}=await s.from("subscription_plans").select("id,code,name,monthly_price,annual_price,currency_code,limits,features,is_active,description").order("monthly_price");
  if(e)setError(e.message);
  else setPlans(data||[]);
  if(showLoading)setLoading(false);
  notifyAdminRefreshComplete();
 },[]);

 useEffect(()=>{load()},[load]);
 useAdminRefresh(useCallback(()=>load(false),[load]));

 const adminAudit=async(action:string,entity_type:string,entity_id:string|null=null,old_data:any=null,new_data:any=null)=>{
  const s=supabase();
  const {data:userData}=await s.auth.getUser();
  if(!userData.user)return;
  const {data:admin}=await s.from("admin_users").select("id").eq("user_id",userData.user.id).maybeSingle();
  if(admin?.id) await s.from("admin_audit_logs").insert({admin_user_id:admin.id,action,entity_type,entity_id,old_data,new_data});
 };

 const openPlan=(p:Plan)=>{
  setEditingPlan(p);
  setPlanForm({
   name:p.name,
   monthly_price:String(p.monthly_price??0),
   annual_price:String(p.annual_price??0),
   currency_code:(p.currency_code||"INR").trim(),
   is_active:p.is_active,
   description:p.description||"",
   limits:JSON.stringify(p.limits||{},null,2),
   features:JSON.stringify(p.features||{},null,2)
  });
 };

 const savePlan=async()=>{
  if(!editingPlan)return;
  const monthly=Number(planForm.monthly_price),annual=Number(planForm.annual_price);
  if(!Number.isFinite(monthly)||monthly<0||!Number.isFinite(annual)||annual<0){
   setError("Plan prices must be valid non-negative numbers.");
   return;
  }
  let limits:any,features:any;
  try{
   limits=JSON.parse(planForm.limits||"{}");
   features=JSON.parse(planForm.features||"{}");
  }catch{
   setError("Plan limits and feature entitlements must be valid JSON.");
   return;
  }
  setSaving(editingPlan.id);
  setError("");
  const {error:e}=await supabase().from("subscription_plans").update({
   name:planForm.name.trim(),
   monthly_price:monthly,
   annual_price:annual,
   currency_code:planForm.currency_code.trim().toUpperCase().slice(0,3),
   is_active:planForm.is_active,
   description:planForm.description.trim(),
   limits,
   features
  }).eq("id",editingPlan.id);
  if(e)setError(e.message);
  else{
   await adminAudit("SUBSCRIPTION_PLAN_UPDATED","subscription_plans",editingPlan.id,editingPlan,{...editingPlan,...planForm,monthly_price:monthly,annual_price:annual});
   setEditingPlan(null);
   await load(false);
  }
  setSaving(null);
 };

 return <AdminShell active="/subscription">
  {error&&<div className="notice errorNotice">{error}</div>}
  {loading?<div className="card">Loading subscription controls...</div>:<>
   <div className="statsRow billingKpis">
    <div className="card"><div className="label">Active Plans</div><div className="value">{plans.filter(p=>p.is_active).length}</div><div className="kpiHint">Live subscription products</div></div>
    <div className="card"><div className="label">Total Plans</div><div className="value">{plans.length}</div><div className="kpiHint">Catalogue entries</div></div>
    <div className="card"><div className="label">Monthly Price Points</div><div className="value">{plans.filter(p=>p.is_active&&Number(p.monthly_price)>0).length}</div><div className="kpiHint">Paid monthly tiers</div></div>
    <div className="card"><div className="label">Annual Price Points</div><div className="value">{plans.filter(p=>p.is_active&&Number(p.annual_price)>0).length}</div><div className="kpiHint">Paid annual tiers</div></div>
    <div className="card"><div className="label">Free / ₹0 Plans</div><div className="value">{plans.filter(p=>p.is_active&&Number(p.monthly_price)===0&&Number(p.annual_price)===0).length}</div><div className="kpiHint">Entry tiers</div></div>
   </div>
   <section className="card financePanel settingsTabPanel billingCatalogue">
    <div className="panelHeader">
     <div><div className="panelTitle">Subscription Catalogue</div><div className="muted panelSubtitle">Commercial source of truth for plans, prices, limits and feature entitlements.</div></div>
     <span className="panelMeta">{plans.length} plans</span>
    </div>
    <div className="tableWrap settingsSubTable">
     <table><thead><tr><th>Plan</th><th>Monthly</th><th>Annual</th><th>Limits</th><th>Features</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>{plans.map(p=><tr key={p.id}>
       <td><strong>{p.name}</strong><div className="muted">{p.code}</div><div className="muted planDescription">{p.description||"No description"}</div></td>
       <td><strong>{p.currency_code} {Number(p.monthly_price||0).toLocaleString("en-IN")}</strong><div className="muted">/ month</div></td>
       <td><strong>{p.currency_code} {Number(p.annual_price||0).toLocaleString("en-IN")}</strong><div className="muted">/ year</div></td>
       <td><span className="jsonCount">{p.limits&&typeof p.limits==="object"?Object.keys(p.limits).length:0} controls</span></td>
       <td><span className="jsonCount">{p.features&&typeof p.features==="object"?Object.keys(p.features).length:0} entitlements</span></td>
       <td><span className={p.is_active?"badge good":"badge"}>{p.is_active?"Active":"Inactive"}</span></td>
       <td><button className="linkButton" onClick={()=>openPlan(p)}>Edit</button></td>
      </tr>)}</tbody>
     </table>
     {!plans.length&&<div className="empty">No subscription plans configured.</div>}
    </div>
   </section>

   {editingPlan&&<section className="card financePanel planEditorPanel">
    <div className="panelHeader"><div><div className="panelTitle">Edit Subscription Plan</div><div className="muted panelSubtitle">Manage commercial terms, usage limits and feature entitlements.</div></div></div>
    <div className="planIdentityGrid">
     <label>Plan Name<input className="input" value={planForm.name} onChange={e=>setPlanForm({...planForm,name:e.target.value})}/></label>
     <label>Currency<input className="input" maxLength={3} value={planForm.currency_code} onChange={e=>setPlanForm({...planForm,currency_code:e.target.value})}/></label>
     <label>Monthly Price<input className="input" type="number" min="0" value={planForm.monthly_price} onChange={e=>setPlanForm({...planForm,monthly_price:e.target.value})}/></label>
     <label>Annual Price<input className="input" type="number" min="0" value={planForm.annual_price} onChange={e=>setPlanForm({...planForm,annual_price:e.target.value})}/></label>
     <label className="planDescriptionField">Plan Description<input className="input" value={planForm.description} onChange={e=>setPlanForm({...planForm,description:e.target.value})}/></label>
    </div>
    <div className="billingSettingsGrid">
     <label className="billingSettingCard"><strong>Plan Limits</strong><span>Usage quotas such as users, products, transactions, storage and forecast horizon.</span><textarea className="billingJsonEditor" value={planForm.limits} onChange={e=>setPlanForm({...planForm,limits:e.target.value})}/></label>
     <label className="billingSettingCard"><strong>Feature Entitlements</strong><span>Modules and advanced capabilities included in this plan.</span><textarea className="billingJsonEditor" value={planForm.features} onChange={e=>setPlanForm({...planForm,features:e.target.value})}/></label>
    </div>
    <label className="switchRow"><input type="checkbox" checked={planForm.is_active} onChange={e=>setPlanForm({...planForm,is_active:e.target.checked})}/><span>{planForm.is_active?"Plan active and available":"Plan inactive"}</span></label>
    <div className="addAdminActions"><button className="secondaryButton" onClick={()=>setEditingPlan(null)}>Cancel</button><button className="primaryButton" disabled={saving===editingPlan.id} onClick={savePlan}>{saving===editingPlan.id?"Saving...":"Save Plan"}</button></div>
   </section>}
  </>}
 </AdminShell>;
}
