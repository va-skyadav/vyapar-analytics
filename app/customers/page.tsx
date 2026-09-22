import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppShell, getBusinessContext } from "@/components/app-shell";

async function addCustomer(formData: FormData) {
  "use server";
  const supabase = await createClient(); const ctx = await getBusinessContext(supabase); if (!ctx) redirect("/login");
  const name = String(formData.get("name") || "").trim(); if (!name) return;
  await supabase.from("customers").insert({business_id:ctx.business.id,name,phone:String(formData.get("phone")||"").trim()||null,email:String(formData.get("email")||"").trim()||null,tax_number:String(formData.get("tax_number")||"").trim()||null,credit_limit:Number(formData.get("credit_limit")||0)});
  revalidatePath("/customers");
}
export default async function CustomersPage() {
  const supabase=await createClient(); const ctx=await getBusinessContext(supabase); if(!ctx) redirect("/create-business");
  const {data:customers}=await supabase.from("customers").select("id,name,phone,email,credit_limit,opening_balance,is_active").eq("business_id",ctx.business.id).order("created_at",{ascending:false});
  return <AppShell businessName={ctx.business.name} title="Customers"><section className="content"><div className="headerRow"><div><h2>Customers</h2><p>Customer master data becomes the base for receivables and sales analytics.</p></div><a className="action primary" href="/sales">Record sale</a></div>
  <div className="splitGrid"><form action={addCustomer} className="card authForm compactForm"><h3>Add customer</h3><label>Name<input name="name" required/></label><label>Phone<input name="phone"/></label><label>Email<input name="email" type="email"/></label><label>Tax number<input name="tax_number"/></label><label>Credit limit<input name="credit_limit" type="number" min="0" step="0.01" defaultValue="0"/></label><button className="authButton" type="submit">Add customer</button></form>
  <div className="card tableCard"><h3>Customer master</h3>{customers?.length?<div className="tableWrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Credit limit</th></tr></thead><tbody>{customers.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.phone||"—"}</td><td>{c.email||"—"}</td><td>₹{Number(c.credit_limit).toLocaleString("en-IN")}</td></tr>)}</tbody></table></div>:<div className="emptyInline">No customers yet. Add customers before recording customer-linked sales.</div>}</div></div></section></AppShell>;
}
