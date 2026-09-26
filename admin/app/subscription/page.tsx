"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import AdminShell from "../../components/admin-shell";
import {supabase} from "../../lib/supabase";
import {notifyAdminRefreshComplete,useAdminRefresh} from "../../lib/admin-refresh";

type Plan={id:string;code:string;name:string;monthly_price:number;annual_price:number;currency_code:string;limits:any;features:any;is_active:boolean;description?:string|null};
type Module={id?:string;plan_id:string;module_code:string;module_name:string;enabled:boolean;limit_value:number|null;limit_unit:string|null;notes:string|null};
type Offer={id:string;code:string;name:string;description:string|null;offer_type:string;discount_type:string;discount_value:number;buy_quantity:number|null;free_quantity:number|null;trial_days:number|null;credit_amount:number|null;starts_at:string|null;ends_at:string|null;max_redemptions:number|null;max_redemptions_per_customer:number;first_time_only:boolean;auto_apply:boolean;stackable:boolean;is_active:boolean};
type Subscription={id:string;business_id:string;plan_id:string;status:string;current_period_end:string|null;cancel_at_period_end:boolean;businesses?:{name:string}|null;subscription_plans?:{name:string}|null};
type Billing={id:string;default_trial_days:number;grace_period_days:number;invoice_due_days:number;auto_renew:boolean;proration_mode:string;cancellation_mode:string;failed_payment_action:string;dunning_enabled:boolean;tax_mode:string;billing_anchor:string;default_currency:string;payment_provider:string|null};

const MODULES=[["analytics","Analytics"],["accounting","Accounting"],["inventory","Inventory"],["hr","HR"],["taxation","Taxation"],["predictions","Predictions"],["ai_assistant","AI Assistant"],["advanced_analytics","Advanced Analytics"]];

const blankPlan={code:"",name:"",monthly_price:"0",annual_price:"0",currency_code:"INR",is_active:true,description:"",limits:"{}",features:"{}"};
const blankOffer={code:"",name:"",description:"",offer_type:"discount",discount_type:"percent",discount_value:"0",buy_quantity:"2",free_quantity:"1",trial_days:"14",credit_amount:"0",starts_at:"",ends_at:"",max_redemptions:"",max_redemptions_per_customer:"1",first_time_only:false,auto_apply:false,stackable:false,is_active:true};

export default function Subscription(){
 const [tab,setTab]=useState("overview");
 const [plans,setPlans]=useState<Plan[]>([]);
 const [modules,setModules]=useState<Module[]>([]);
 const [offers,setOffers]=useState<Offer[]>([]);
 const [subscriptions,setSubscriptions]=useState<Subscription[]>([]);
 const [billing,setBilling]=useState<Billing|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [saving,setSaving]=useState("");
 const [editingPlan,setEditingPlan]=useState<Plan|null>(null);
 const [planForm,setPlanForm]=useState<any>(blankPlan);
 const [offerForm,setOfferForm]=useState<any>(blankOffer);
 const [editingOffer,setEditingOffer]=useState<Offer|null>(null);
 const [selectedPlanId,setSelectedPlanId]=useState("");
 const [planModules,setPlanModules]=useState<Record<string,Module>>({});
 const [search,setSearch]=useState("");

 const load=useCallback(async(show=true)=>{
  if(show)setLoading(true);setError("");
  const s=supabase();
  const [p,m,o,sub,b]=await Promise.all([
   s.from("subscription_plans").select("id,code,name,monthly_price,annual_price,currency_code,limits,features,is_active,description").order("monthly_price"),
   s.from("subscription_plan_modules").select("id,plan_id,module_code,module_name,enabled,limit_value,limit_unit,notes"),
   s.from("subscription_offers").select("*").order("created_at",{ascending:false}),
   s.from("business_subscriptions").select("id,business_id,plan_id,status,current_period_end,cancel_at_period_end,businesses(name),subscription_plans(name)").order("created_at",{ascending:false}).limit(100),
   s.from("subscription_billing_settings").select("*").limit(1).maybeSingle()
  ]);
  const first=p.error||m.error||o.error||sub.error||b.error;
  if(first)setError(first.message);
  else{setPlans(p.data||[]);setModules(m.data||[]);setOffers(o.data||[]);setSubscriptions((sub.data||[]) as Subscription[]);setBilling(b.data||null);}
  if(show)setLoading(false);notifyAdminRefreshComplete();
 },[]);
 useEffect(()=>{load()},[load]);
 useAdminRefresh(useCallback(()=>load(false),[load]));

 const audit=async(action:string,entity:string,id:string|null,oldData:any=null,newData:any=null)=>{
  const s=supabase();const {data:u}=await s.auth.getUser();if(!u.user)return;
  const {data:a}=await s.from("admin_users").select("id").eq("user_id",u.user.id).maybeSingle();
  if(a?.id)await s.from("admin_audit_logs").insert({admin_user_id:a.id,action,entity_type:entity,entity_id:id,old_data:oldData,new_data:newData});
 };

 const openPlan=(p:Plan)=>{
  setEditingPlan(p);setSelectedPlanId(p.id);
  setPlanForm({code:p.code,name:p.name,monthly_price:String(p.monthly_price??0),annual_price:String(p.annual_price??0),currency_code:(p.currency_code||"INR").trim(),is_active:p.is_active,description:p.description||"",limits:JSON.stringify(p.limits||{},null,2),features:JSON.stringify(p.features||{},null,2)});
  const map:Record<string,Module>={};modules.filter(x=>x.plan_id===p.id).forEach(x=>map[x.module_code]=x);
  setPlanModules(map);setTab("plans");
 };
 const newPlan=()=>{setEditingPlan(null);setSelectedPlanId("");setPlanForm({...blankPlan});setPlanModules({});setTab("plans");};

 const savePlan=async()=>{
  const monthly=Number(planForm.monthly_price),annual=Number(planForm.annual_price);
  if(!planForm.code.trim()||!planForm.name.trim()){setError("Plan code and name are required.");return;}
  if(!Number.isFinite(monthly)||monthly<0||!Number.isFinite(annual)||annual<0){setError("Plan prices must be valid non-negative numbers.");return;}
  let limits:any,features:any;try{limits=JSON.parse(planForm.limits||"{}");features=JSON.parse(planForm.features||"{}")}catch{setError("Limits and feature entitlements must be valid JSON.");return;}
  setSaving("plan");setError("");const s=supabase();
  let planId=editingPlan?.id;
  if(editingPlan){
   const {error:e}=await s.from("subscription_plans").update({code:planForm.code.trim().toLowerCase(),name:planForm.name.trim(),monthly_price:monthly,annual_price:annual,currency_code:planForm.currency_code.trim().toUpperCase().slice(0,3),is_active:planForm.is_active,description:planForm.description.trim(),limits,features}).eq("id",editingPlan.id);
   if(e){setError(e.message);setSaving("");return}
  }else{
   const {data,e}=await s.from("subscription_plans").insert({code:planForm.code.trim().toLowerCase(),name:planForm.name.trim(),monthly_price:monthly,annual_price:annual,currency_code:planForm.currency_code.trim().toUpperCase().slice(0,3),is_active:planForm.is_active,description:planForm.description.trim(),limits,features}).select("id").single();
   if(e){setError(e.message);setSaving("");return} planId=data.id;
  }
  if(planId){
   await s.from("subscription_plan_modules").delete().eq("plan_id",planId);
   const rows=MODULES.map(([code,name])=>({plan_id:planId,module_code:code,module_name:name,enabled:Boolean(planModules[code]?.enabled),limit_value:planModules[code]?.limit_value??null,limit_unit:planModules[code]?.limit_unit||null,notes:planModules[code]?.notes||null}));
   await s.from("subscription_plan_modules").insert(rows);
  }
  await audit(editingPlan?"SUBSCRIPTION_PLAN_UPDATED":"SUBSCRIPTION_PLAN_CREATED","subscription_plans",planId||null,editingPlan,planForm);
  setSaving("");setEditingPlan(null);await load(false);
 };

 const editOffer=(o:Offer)=>{setEditingOffer(o);setOfferForm({code:o.code,name:o.name,description:o.description||"",offer_type:o.offer_type,discount_type:o.discount_type,discount_value:String(o.discount_value??0),buy_quantity:String(o.buy_quantity??2),free_quantity:String(o.free_quantity??1),trial_days:String(o.trial_days??14),credit_amount:String(o.credit_amount??0),starts_at:o.starts_at?o.starts_at.slice(0,16):"",ends_at:o.ends_at?o.ends_at.slice(0,16):"",max_redemptions:o.max_redemptions?String(o.max_redemptions):"",max_redemptions_per_customer:String(o.max_redemptions_per_customer??1),first_time_only:o.first_time_only,auto_apply:o.auto_apply,stackable:o.stackable,is_active:o.is_active});};
 const newOffer=()=>{setEditingOffer(null);setOfferForm({...blankOffer});};

 const saveOffer=async()=>{
  if(!offerForm.code.trim()||!offerForm.name.trim()){setError("Offer code and name are required.");return}
  setSaving("offer");setError("");
  const payload={code:offerForm.code.trim().toUpperCase(),name:offerForm.name.trim(),description:offerForm.description.trim(),offer_type:offerForm.offer_type,discount_type:offerForm.discount_type,discount_value:Number(offerForm.discount_value)||0,buy_quantity:offerForm.offer_type==="buy_x_get_y"?Number(offerForm.buy_quantity)||null:null,free_quantity:offerForm.offer_type==="buy_x_get_y"?Number(offerForm.free_quantity)||null:null,trial_days:offerForm.offer_type==="free_trial"?Number(offerForm.trial_days)||0:null,credit_amount:offerForm.offer_type==="credit"?Number(offerForm.credit_amount)||0:null,starts_at:offerForm.starts_at||null,ends_at:offerForm.ends_at||null,max_redemptions:offerForm.max_redemptions?Number(offerForm.max_redemptions):null,max_redemptions_per_customer:Number(offerForm.max_redemptions_per_customer)||1,first_time_only:offerForm.first_time_only,auto_apply:offerForm.auto_apply,stackable:offerForm.stackable,is_active:offerForm.is_active};
  const {data,e}=editingOffer?await supabase().from("subscription_offers").update(payload).eq("id",editingOffer.id).select("*").single():await supabase().from("subscription_offers").insert(payload).select("*").single();
  if(e){setError(e.message);setSaving("");return}
  await audit(editingOffer?"SUBSCRIPTION_OFFER_UPDATED":"SUBSCRIPTION_OFFER_CREATED","subscription_offers",data?.id||null,editingOffer,payload);
  setSaving("");setEditingOffer(null);await load(false);
 };

 const saveBilling=async()=>{
  if(!billing)return;setSaving("billing");setError("");
  const {error:e}=await supabase().from("subscription_billing_settings").update({...billing,updated_at:new Date().toISOString()}).eq("id",billing.id);
  if(e)setError(e.message);else await audit("SUBSCRIPTION_BILLING_SETTINGS_UPDATED","subscription_billing_settings",billing.id,null,billing);
  setSaving("");await load(false);
 };

 const updateSubscription=async(id:string,patch:any)=>{
  setSaving("sub:"+id);setError("");
  const old=subscriptions.find(x=>x.id===id);
  const {error:e}=await supabase().from("business_subscriptions").update({...patch,updated_at:new Date().toISOString()}).eq("id",id);
  if(e)setError(e.message);else await audit("BUSINESS_SUBSCRIPTION_UPDATED","business_subscriptions",id,old,patch);
  setSaving("");await load(false);
 };

 const activePlans=plans.filter(p=>p.is_active).length;
 const activeOffers=offers.filter(o=>o.is_active).length;
 const activeSubs=subscriptions.filter(s=>["active","trialing"].includes(s.status)).length;
 const mrr=activeSubs?subscriptions.reduce((sum,s)=>{const p=plans.find(x=>x.id===s.plan_id);return sum+(p?Number(p.monthly_price||0):0)},0):0;
 const filteredSubs=subscriptions.filter(s=>(s.businesses?.name||"").toLowerCase().includes(search.toLowerCase())||(s.subscription_plans?.name||"").toLowerCase().includes(search.toLowerCase())||s.status.toLowerCase().includes(search.toLowerCase()));

 const selectedModules=useMemo(()=>MODULES.map(([code,name])=>planModules[code]||{module_code:code,module_name:name,enabled:false,limit_value:null,limit_unit:null,notes:null}),[planModules]);

 return <AdminShell active="/subscription">
  {error&&<div className="notice errorNotice">{error}</div>}
  {loading?<div className="card">Loading subscription management...</div>:<>
   <div className="subscriptionKpis">
    <div className="card"><div className="label">Active Plans</div><div className="value">{activePlans}</div><div className="kpiHint">Published catalogue tiers</div></div>
    <div className="card"><div className="label">Active Subscriptions</div><div className="value">{activeSubs}</div><div className="kpiHint">Active + trialing accounts</div></div>
    <div className="card"><div className="label">Estimated MRR</div><div className="value">₹{mrr.toLocaleString("en-IN")}</div><div className="kpiHint">Based on current monthly plan prices</div></div>
    <div className="card"><div className="label">Live Offers</div><div className="value">{activeOffers}</div><div className="kpiHint">Promotions available</div></div>
    <div className="card"><div className="label">Billing Rules</div><div className="value">{billing?"Configured":"—"}</div><div className="kpiHint">Central subscription policy</div></div>
   </div>

   <div className="subscriptionTabs">
    {[["overview","Overview"],["plans","Plans & Pricing"],["offers","Offers & Promotions"],["modules","Modules & Entitlements"],["subscriptions","Customer Subscriptions"],["billing","Billing Rules"]].map(([id,label])=><button key={id} className={tab===id?"subscriptionTab active":"subscriptionTab"} onClick={()=>setTab(id)}>{label}</button>)}
   </div>

   {tab==="overview"&&<div className="subscriptionOverviewGrid">
    <section className="card financePanel"><div className="panelHeader"><div><div className="panelTitle">Subscription Control Centre</div><div className="muted panelSubtitle">One operating surface for pricing, packaging, promotions, customer subscriptions and billing policy.</div></div></div>
     <div className="controlTiles">
      <button onClick={()=>setTab("plans")}><strong>Plans & Pricing</strong><span>Create tiers, prices, annual discounts, trials and limits.</span></button>
      <button onClick={()=>setTab("offers")}><strong>Offers & Promotions</strong><span>Discounts, coupons, free trials and Buy X Get Y rules.</span></button>
      <button onClick={()=>setTab("modules")}><strong>Modules & Entitlements</strong><span>Control which VA modules each plan unlocks and how much usage is included.</span></button>
      <button onClick={()=>setTab("subscriptions")}><strong>Customer Subscriptions</strong><span>View, change, cancel or restore customer subscriptions.</span></button>
      <button onClick={()=>setTab("billing")}><strong>Billing Rules</strong><span>Trials, renewals, proration, grace periods, tax and failed-payment policy.</span></button>
     </div>
    </section>
    <section className="card financePanel"><div className="panelHeader"><div><div className="panelTitle">Commercial Guardrails</div><div className="muted panelSubtitle">Controls that protect pricing consistency and billing operations.</div></div></div>
     <div className="guardrailList"><div><strong>Plan changes</strong><span>Existing customer subscriptions remain explicit records; changing a catalogue plan does not silently change customer history.</span></div><div><strong>Promotions</strong><span>Offers have activation windows, redemption limits and customer eligibility controls.</span></div><div><strong>Entitlements</strong><span>Modules are separated from price so packaging can evolve without rewriting billing logic.</span></div><div><strong>Auditability</strong><span>Administrative changes are written to the platform audit log.</span></div></div>
    </section>
   </div>}

   {tab==="plans"&&<><div className="sectionToolbar"><div><div className="panelTitle">Plans & Pricing</div><div className="muted panelSubtitle">Create and maintain the commercial catalogue.</div></div><button className="primaryButton" onClick={newPlan}>+ New Plan</button></div>
    <section className="card financePanel"><div className="tableWrap"><table><thead><tr><th>Plan</th><th>Monthly</th><th>Annual</th><th>Modules</th><th>Status</th><th>Action</th></tr></thead><tbody>{plans.map(p=><tr key={p.id}><td><strong>{p.name}</strong><div className="muted">{p.code}</div></td><td>{p.currency_code} {Number(p.monthly_price||0).toLocaleString("en-IN")}</td><td>{p.currency_code} {Number(p.annual_price||0).toLocaleString("en-IN")}</td><td>{modules.filter(m=>m.plan_id===p.id&&m.enabled).length}/{MODULES.length}</td><td><span className={p.is_active?"badge good":"badge"}>{p.is_active?"Active":"Inactive"}</span></td><td><button className="linkButton" onClick={()=>openPlan(p)}>Edit</button></td></tr>)}</tbody></table>{!plans.length&&<div className="empty">No plans configured.</div>}</div></section>
    {(editingPlan||planForm.name||tab==="plans"&&selectedPlanId==="")&&<section className="card financePanel planEditorPanel"><div className="panelHeader"><div><div className="panelTitle">{editingPlan?"Edit Plan":"Create Plan"}</div><div className="muted panelSubtitle">Define price, packaging, limits and availability.</div></div></div>
     <div className="planIdentityGrid"><label>Plan Code<input className="input" value={planForm.code} onChange={e=>setPlanForm({...planForm,code:e.target.value})}/></label><label>Plan Name<input className="input" value={planForm.name} onChange={e=>setPlanForm({...planForm,name:e.target.value})}/></label><label>Currency<input className="input" maxLength={3} value={planForm.currency_code} onChange={e=>setPlanForm({...planForm,currency_code:e.target.value})}/></label><label>Monthly Price<input className="input" type="number" min="0" value={planForm.monthly_price} onChange={e=>setPlanForm({...planForm,monthly_price:e.target.value})}/></label><label>Annual Price<input className="input" type="number" min="0" value={planForm.annual_price} onChange={e=>setPlanForm({...planForm,annual_price:e.target.value})}/></label><label className="planDescriptionField">Description<input className="input" value={planForm.description} onChange={e=>setPlanForm({...planForm,description:e.target.value})}/></label></div>
     <div className="moduleEditorGrid">{selectedModules.map(m=><label className={m.enabled?"moduleEditor on":"moduleEditor"} key={m.module_code}><input type="checkbox" checked={m.enabled} onChange={e=>setPlanModules({...planModules,[m.module_code]:{...m,enabled:e.target.checked}})}/><span><strong>{m.module_name}</strong><small>Included module</small></span><input className="moduleLimitInput" placeholder="Limit" type="number" min="0" value={m.limit_value??""} onChange={e=>setPlanModules({...planModules,[m.module_code]:{...m,limit_value:e.target.value===""?null:Number(e.target.value)}})}/></label>)}</div>
     <div className="billingSettingsGrid"><label className="billingSettingCard"><strong>Usage Limits</strong><span>Advanced quotas for users, products, transactions, storage and forecasting.</span><textarea className="billingJsonEditor" value={planForm.limits} onChange={e=>setPlanForm({...planForm,limits:e.target.value})}/></label><label className="billingSettingCard"><strong>Feature Entitlements</strong><span>Advanced capabilities that are not represented by module switches.</span><textarea className="billingJsonEditor" value={planForm.features} onChange={e=>setPlanForm({...planForm,features:e.target.value})}/></label></div>
     <label className="switchRow"><input type="checkbox" checked={planForm.is_active} onChange={e=>setPlanForm({...planForm,is_active:e.target.checked})}/><span>{planForm.is_active?"Published / available for purchase":"Draft / unavailable"}</span></label><div className="addAdminActions"><button className="secondaryButton" onClick={()=>{setEditingPlan(null);setPlanForm({...blankPlan});setSelectedPlanId("__closed")}}>Close</button><button className="primaryButton" disabled={saving==="plan"} onClick={savePlan}>{saving==="plan"?"Saving...":editingPlan?"Save Plan":"Create Plan"}</button></div>
    </section>}
   </>}

   {tab==="offers"&&<><div className="sectionToolbar"><div><div className="panelTitle">Offers & Promotions</div><div className="muted panelSubtitle">Manage discount logic, promotional windows and acquisition incentives.</div></div><button className="primaryButton" onClick={newOffer}>+ New Offer</button></div>
    <section className="card financePanel"><div className="tableWrap"><table><thead><tr><th>Offer</th><th>Type</th><th>Rule</th><th>Validity</th><th>Controls</th><th>Status</th><th>Action</th></tr></thead><tbody>{offers.map(o=><tr key={o.id}><td><strong>{o.name}</strong><div className="muted">{o.code}</div></td><td>{o.offer_type.replaceAll("_"," ")}</td><td>{o.offer_type==="buy_x_get_y"?`Buy ${o.buy_quantity} Get ${o.free_quantity}`:o.discount_type==="percent"?`${o.discount_value}% off`:o.discount_type==="fixed"?`${o.discount_value} fixed`:o.offer_type==="free_trial"?`${o.trial_days} trial days`:"Configured"}</td><td>{o.starts_at?new Date(o.starts_at).toLocaleDateString("en-IN"):"Now"} – {o.ends_at?new Date(o.ends_at).toLocaleDateString("en-IN"):"Open"}</td><td>{o.first_time_only?"First-order · ":""}{o.max_redemptions?o.max_redemptions+" max · ":""}{o.auto_apply?"Auto":"Code"}</td><td><span className={o.is_active?"badge good":"badge"}>{o.is_active?"Live":"Inactive"}</span></td><td><button className="linkButton" onClick={()=>editOffer(o)}>Edit</button></td></tr>)}</tbody></table>{!offers.length&&<div className="empty">No offers configured.</div>}</div></section>
    {(editingOffer||offerForm.name)&&<section className="card financePanel planEditorPanel"><div className="panelHeader"><div><div className="panelTitle">{editingOffer?"Edit Offer":"Create Offer"}</div><div className="muted panelSubtitle">Supports discounts, Buy X Get Y, free trials, credits and price overrides.</div></div></div>
     <div className="offerFormGrid"><label>Offer Code<input className="input" value={offerForm.code} onChange={e=>setOfferForm({...offerForm,code:e.target.value})}/></label><label>Offer Name<input className="input" value={offerForm.name} onChange={e=>setOfferForm({...offerForm,name:e.target.value})}/></label><label>Offer Type<select className="input" value={offerForm.offer_type} onChange={e=>setOfferForm({...offerForm,offer_type:e.target.value})}><option value="discount">Discount</option><option value="buy_x_get_y">Buy X Get Y</option><option value="free_trial">Free Trial</option><option value="credit">Credit</option><option value="price_override">Price Override</option></select></label><label>Discount Type<select className="input" value={offerForm.discount_type} onChange={e=>setOfferForm({...offerForm,discount_type:e.target.value})}><option value="none">None</option><option value="percent">Percentage</option><option value="fixed">Fixed Amount</option></select></label><label>Discount / Value<input className="input" type="number" min="0" value={offerForm.discount_value} onChange={e=>setOfferForm({...offerForm,discount_value:e.target.value})}/></label><label>Buy Quantity<input className="input" type="number" min="1" value={offerForm.buy_quantity} onChange={e=>setOfferForm({...offerForm,buy_quantity:e.target.value})}/></label><label>Free Quantity<input className="input" type="number" min="1" value={offerForm.free_quantity} onChange={e=>setOfferForm({...offerForm,free_quantity:e.target.value})}/></label><label>Trial Days<input className="input" type="number" min="0" value={offerForm.trial_days} onChange={e=>setOfferForm({...offerForm,trial_days:e.target.value})}/></label><label>Starts<input className="input" type="datetime-local" value={offerForm.starts_at} onChange={e=>setOfferForm({...offerForm,starts_at:e.target.value})}/></label><label>Ends<input className="input" type="datetime-local" value={offerForm.ends_at} onChange={e=>setOfferForm({...offerForm,ends_at:e.target.value})}/></label><label>Max Redemptions<input className="input" type="number" min="1" value={offerForm.max_redemptions} onChange={e=>setOfferForm({...offerForm,max_redemptions:e.target.value})}/></label><label>Per Customer<input className="input" type="number" min="1" value={offerForm.max_redemptions_per_customer} onChange={e=>setOfferForm({...offerForm,max_redemptions_per_customer:e.target.value})}/></label><label className="planDescriptionField">Description<input className="input" value={offerForm.description} onChange={e=>setOfferForm({...offerForm,description:e.target.value})}/></label></div>
     <div className="offerChecks"><label><input type="checkbox" checked={offerForm.first_time_only} onChange={e=>setOfferForm({...offerForm,first_time_only:e.target.checked})}/> First purchase only</label><label><input type="checkbox" checked={offerForm.auto_apply} onChange={e=>setOfferForm({...offerForm,auto_apply:e.target.checked})}/> Auto apply</label><label><input type="checkbox" checked={offerForm.stackable} onChange={e=>setOfferForm({...offerForm,stackable:e.target.checked})}/> Stackable</label><label><input type="checkbox" checked={offerForm.is_active} onChange={e=>setOfferForm({...offerForm,is_active:e.target.checked})}/> Active</label></div>
     <div className="addAdminActions"><button className="secondaryButton" onClick={()=>{setEditingOffer(null);setOfferForm({...blankOffer})}}>Close</button><button className="primaryButton" disabled={saving==="offer"} onClick={saveOffer}>{saving==="offer"?"Saving...":editingOffer?"Save Offer":"Create Offer"}</button></div>
    </section>}
   </>}

   {tab==="modules"&&<><div className="sectionToolbar"><div><div className="panelTitle">Modules & Entitlements</div><div className="muted panelSubtitle">Control the packaging layer independently from pricing.</div></div><select className="input modulePlanSelect" value={selectedPlanId} onChange={e=>{const p=plans.find(x=>x.id===e.target.value);if(p)openPlan(p)}}><option value="">Select a plan</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
    <section className="card financePanel"><div className="moduleMatrix">{selectedPlanId?selectedModules.map(m=><div className="moduleMatrixRow" key={m.module_code}><div><strong>{m.module_name}</strong><span>{m.module_code}</span></div><span className={m.enabled?"badge good":"badge"}>{m.enabled?"Included":"Not included"}</span><span>{m.limit_value==null?"Unlimited / configured in limits":m.limit_value+" units"}</span></div>):<div className="empty">Select a plan to inspect its module entitlements.</div>}</div></section>
   </>}

   {tab==="subscriptions"&&<><div className="sectionToolbar"><div><div className="panelTitle">Customer Subscriptions</div><div className="muted panelSubtitle">Operational control over customer subscription lifecycle.</div></div><input className="input subscriptionSearch" placeholder="Search business, plan or status..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <section className="card financePanel"><div className="tableWrap"><table><thead><tr><th>Business</th><th>Plan</th><th>Status</th><th>Period End</th><th>Cancellation</th><th>Action</th></tr></thead><tbody>{filteredSubs.map(s=><tr key={s.id}><td><strong>{s.businesses?.name||s.business_id.slice(0,8)}</strong></td><td>{s.subscription_plans?.name||s.plan_id.slice(0,8)}</td><td><span className="badge">{s.status}</span></td><td>{s.current_period_end?new Date(s.current_period_end).toLocaleDateString("en-IN"):"—"}</td><td>{s.cancel_at_period_end?"At period end":"Active renewal"}</td><td><div className="rowActions"><button className="linkButton" disabled={saving==="sub:"+s.id} onClick={()=>updateSubscription(s.id,{cancel_at_period_end:!s.cancel_at_period_end})}>{s.cancel_at_period_end?"Restore":"Cancel at end"}</button>{s.status!=="active"&&<button className="linkButton" disabled={saving==="sub:"+s.id} onClick={()=>updateSubscription(s.id,{status:"active"})}>Activate</button>}</div></td></tr>)}</tbody></table>{!filteredSubs.length&&<div className="empty">No customer subscriptions found.</div>}</div></section>
   </>}

   {tab==="billing"&&billing&&<><div className="sectionToolbar"><div><div className="panelTitle">Billing Rules</div><div className="muted panelSubtitle">Central policy for trials, renewals, proration, tax and payment recovery.</div></div><button className="primaryButton" disabled={saving==="billing"} onClick={saveBilling}>{saving==="billing"?"Saving...":"Save Billing Rules"}</button></div>
    <section className="card financePanel"><div className="billingRuleGrid">
     <label>Default Trial Days<input className="input" type="number" min="0" value={billing.default_trial_days} onChange={e=>setBilling({...billing,default_trial_days:Number(e.target.value)})}/></label>
     <label>Grace Period Days<input className="input" type="number" min="0" value={billing.grace_period_days} onChange={e=>setBilling({...billing,grace_period_days:Number(e.target.value)})}/></label>
     <label>Invoice Due Days<input className="input" type="number" min="0" value={billing.invoice_due_days} onChange={e=>setBilling({...billing,invoice_due_days:Number(e.target.value)})}/></label>
     <label>Currency<input className="input" maxLength={3} value={billing.default_currency} onChange={e=>setBilling({...billing,default_currency:e.target.value.toUpperCase()})}/></label>
     <label>Payment Provider<input className="input" value={billing.payment_provider||""} onChange={e=>setBilling({...billing,payment_provider:e.target.value})}/></label>
     <label>Proration<select className="input" value={billing.proration_mode} onChange={e=>setBilling({...billing,proration_mode:e.target.value})}><option value="prorate">Prorate immediately</option><option value="next_cycle">Apply next cycle</option><option value="none">No proration</option></select></label>
     <label>Cancellation<select className="input" value={billing.cancellation_mode} onChange={e=>setBilling({...billing,cancellation_mode:e.target.value})}><option value="period_end">End of period</option><option value="immediate">Immediate</option></select></label>
     <label>Failed Payment<select className="input" value={billing.failed_payment_action} onChange={e=>setBilling({...billing,failed_payment_action:e.target.value})}><option value="retry_and_grace">Retry + grace period</option><option value="pause">Pause subscription</option><option value="cancel">Cancel subscription</option></select></label>
     <label>Billing Anchor<select className="input" value={billing.billing_anchor} onChange={e=>setBilling({...billing,billing_anchor:e.target.value})}><option value="subscription_start">Subscription start</option><option value="calendar_month">Calendar month</option></select></label>
     <label className="billingToggle"><input type="checkbox" checked={billing.auto_renew} onChange={e=>setBilling({...billing,auto_renew:e.target.checked})}/> Auto-renew subscriptions</label>
     <label className="billingToggle"><input type="checkbox" checked={billing.dunning_enabled} onChange={e=>setBilling({...billing,dunning_enabled:e.target.checked})}/> Enable payment recovery / dunning</label>
     <label className="billingToggle"><input type="checkbox" checked={billing.tax_mode==="inclusive"} onChange={e=>setBilling({...billing,tax_mode:e.target.checked?"inclusive":"exclusive"})}/> Prices include tax</label>
    </div></section>
   </>}
  </>}
 </AdminShell>;
}
