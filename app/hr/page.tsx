import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell, getBusinessContext } from "@/components/app-shell";

const money=(v:number)=>`₹${Math.round(v).toLocaleString("en-IN")}`;

export default async function HRPage(){
 const supabase=await createClient();
 const ctx=await getBusinessContext(supabase);
 if(!ctx) redirect("/create-business");

 const now=new Date();
 const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
 const monthStartIso=monthStart.toISOString();
 const [{data:employees},{data:attendance},{data:leaves},{data:payroll}]=await Promise.all([
  supabase.from("employees").select("id,employee_code,name,department,designation,employment_status,base_salary").eq("business_id",ctx.business.id).order("name"),
  supabase.from("attendance").select("id,employee_id,attendance_date,status,hours").eq("business_id",ctx.business.id).gte("attendance_date",monthStart.toISOString().slice(0,10)),
  supabase.from("leaves").select("id,employee_id,leave_type,start_date,end_date,days,status").eq("business_id",ctx.business.id).order("start_date",{ascending:false}).limit(12),
  supabase.from("payroll").select("id,employee_id,payroll_month,net_salary,payment_status").eq("business_id",ctx.business.id).gte("payroll_month",monthStart.toISOString().slice(0,10)).order("payroll_month",{ascending:false})
 ]);

 const active=(employees||[]).filter(e=>!e.employment_status||["active","employed"].includes(String(e.employment_status).toLowerCase())).length;
 const present=(attendance||[]).filter(a=>["present","worked"].includes(String(a.status).toLowerCase())).length;
 const leaveDays=(leaves||[]).filter(l=>String(l.status||"").toLowerCase()!=="rejected").reduce((s,l)=>s+Number(l.days||0),0);
 const payrollNet=(payroll||[]).reduce((s,p)=>s+Number(p.net_salary||0),0);
 const paidPayroll=(payroll||[]).filter(p=>String(p.payment_status||"").toLowerCase()==="paid").reduce((s,p)=>s+Number(p.net_salary||0),0);
 const avgSalary=active?((employees||[]).filter(e=>!e.employment_status||["active","employed"].includes(String(e.employment_status).toLowerCase())).reduce((s,e)=>s+Number(e.base_salary||0),0)/active):0;
 const employeeById=new Map((employees||[]).map(e=>[e.id,e.name]));

 return <AppShell businessName={ctx.business.name} title="HR">
  <section className="content">
   <div className="pageIntro">
    <div><h2>Human Resources</h2><p>Manage your people data, attendance, leave and payroll from one place.</p></div>
    <span className="period">{now.toLocaleString("en-IN",{month:"long",year:"numeric"})}</span>
   </div>

   <div className="grid">
    <div className="card metricCard"><div className="metricLabel">Employees</div><div className="metricValue">{employees?.length||0}</div><div className="metricCaption">{active} active employees</div></div>
    <div className="card metricCard"><div className="metricLabel">Attendance</div><div className="metricValue">{present}</div><div className="metricCaption">present / worked records this month</div></div>
    <div className="card metricCard"><div className="metricLabel">Leave Days</div><div className="metricValue">{leaveDays}</div><div className="metricCaption">recorded approved / pending days</div></div>
    <div className="card metricCard"><div className="metricLabel">Payroll Net</div><div className="metricValue">{money(payrollNet)}</div><div className="metricCaption">{money(paidPayroll)} marked as paid</div></div>
   </div>

   <div className="grid accountingBalances">
    <div className="card metricCard"><div className="metricLabel">Average Base Salary</div><div className="metricValue">{money(avgSalary)}</div><div className="metricCaption">active employees with salary data</div></div>
    <div className="card metricCard"><div className="metricLabel">Pending Payroll</div><div className="metricValue">{money(Math.max(payrollNet-paidPayroll,0))}</div><div className="metricCaption">net salary not marked paid</div></div>
   </div>

   <div className="analyticsGrid">
    <div className="card tableCard">
     <h3>Employee directory</h3>
     {employees?.length?<div className="tableWrap"><table><thead><tr><th>Employee</th><th>Code</th><th>Department</th><th>Designation</th><th>Status</th></tr></thead><tbody>
      {employees.slice(0,15).map(e=><tr key={e.id}><td>{e.name}</td><td>{e.employee_code||"—"}</td><td>{e.department||"—"}</td><td>{e.designation||"—"}</td><td>{e.employment_status||"—"}</td></tr>)}
     </tbody></table></div>:<div className="emptyInline">No employees have been added yet.</div>}
    </div>
    <div className="card tableCard">
     <h3>Recent leave</h3>
     {leaves?.length?<div className="tableWrap"><table><thead><tr><th>Employee</th><th>Type</th><th>Days</th><th>Status</th></tr></thead><tbody>
      {leaves.slice(0,10).map(l=><tr key={l.id}><td>{employeeById.get(l.employee_id)||"Employee"}</td><td>{l.leave_type}</td><td>{Number(l.days||0)}</td><td>{l.status||"—"}</td></tr>)}
     </tbody></table></div>:<div className="emptyInline">No leave records yet.</div>}
    </div>
   </div>

   <div className="card tableCard accountingExpenseCard">
    <h3>Current-month payroll</h3>
    {payroll?.length?<div className="tableWrap"><table><thead><tr><th>Employee</th><th>Payroll Month</th><th>Net Salary</th><th>Status</th></tr></thead><tbody>
     {payroll.slice(0,15).map(p=><tr key={p.id}><td>{employeeById.get(p.employee_id)||"Employee"}</td><td>{new Date(p.payroll_month).toLocaleDateString("en-IN",{month:"short",year:"numeric"})}</td><td>{money(Number(p.net_salary||0))}</td><td>{p.payment_status||"—"}</td></tr>)}
    </tbody></table></div>:<div className="emptyInline">No payroll records for the current month.</div>}
   </div>

   <div className="card accountingNote"><h3>HR data source</h3><p className="muted">This overview reads the business's employee, attendance, leave and payroll records. Empty states are shown when no HR data exists; no sample employee or salary figures are generated.</p></div>
  </section>
 </AppShell>;
}