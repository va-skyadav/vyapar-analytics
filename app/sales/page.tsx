import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppShell, getBusinessContext } from "@/components/app-shell";

async function addSale(formData: FormData) {
  "use server";
  const supabase=await createClient(); const ctx=await getBusinessContext(supabase); if(!ctx) redirect("/login");
  const {error}=await supabase.rpc("create_sale",{p_business_id:ctx.business.id,p_product_id:String(formData.get("product_id")),p_customer_id:String(formData.get("customer_id")||"")||null,p_quantity:Number(formData.get("quantity")||0),p_unit_price:Number(formData.get("unit_price")||0),p_sale_date:String(formData.get("sale_date")||new Date().toISOString()),p_amount_paid:Number(formData.get("amount_paid")||0)});
  if(error) throw new Error(error.message);
  revalidatePath("/"); revalidatePath("/sales");
}
export default async function SalesPage() {
  const supabase=await createClient(); const ctx=await getBusinessContext(supabase); if(!ctx) redirect("/create-business");
  const [{data:products},{data:customers},{data:sales}]=await Promise.all([
    supabase.from("products").select("id,name,selling_price").eq("business_id",ctx.business.id).eq("is_active",true).order("name"),
    supabase.from("customers").select("id,name").eq("business_id",ctx.business.id).eq("is_active",true).order("name"),
    supabase.from("sales").select("id,invoice_number,sale_date,total,amount_paid,payment_status").eq("business_id",ctx.business.id).order("sale_date",{ascending:false}).limit(20)
  ]);
  return <AppShell businessName={ctx.business.name} title="Sales"><section className="content"><div className="headerRow"><div><h2>Sales</h2><p>Record posted sales so Analytics can calculate real revenue, margin and receivables.</p></div><a className="action" href="/products">Products</a><a className="action" href="/customers">Customers</a></div>
  <div className="splitGrid"><form action={addSale} className="card authForm compactForm"><h3>Record sale</h3>
    <label>Product<select name="product_id" required defaultValue=""><option value="" disabled>Select product</option>{products?.map(p=><option key={p.id} value={p.id}>{p.name} — ₹{Number(p.selling_price).toLocaleString("en-IN")}</option>)}</select></label>
    <label>Customer <span className="optional">(optional)</span><select name="customer_id" defaultValue=""><option value="">Walk-in customer</option>{customers?.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <div className="twoCol"><label>Quantity<input name="quantity" type="number" min="0.01" step="0.01" defaultValue="1" required/></label><label>Unit price<input name="unit_price" type="number" min="0" step="0.01" defaultValue="0" required/></label></div>
    <div className="twoCol"><label>Sale date<input name="sale_date" type="datetime-local" defaultValue={new Date().toISOString().slice(0,16)} required/></label><label>Amount paid<input name="amount_paid" type="number" min="0" step="0.01" defaultValue="0"/></label></div>
    <button className="authButton" type="submit" disabled={!products?.length}>Record sale</button>
    {!products?.length&&<div className="formError">Add a product before recording a sale.</div>}
  </form>
  <div className="card tableCard"><h3>Recent sales</h3>{sales?.length?<div className="tableWrap"><table><thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th></tr></thead><tbody>{sales.map(s=><tr key={s.id}><td>{s.invoice_number||s.id.slice(0,8)}</td><td>{new Date(s.sale_date).toLocaleDateString("en-IN")}</td><td>₹{Number(s.total).toLocaleString("en-IN")}</td><td>₹{Number(s.amount_paid).toLocaleString("en-IN")}</td><td>{s.payment_status}</td></tr>)}</tbody></table></div>:<div className="emptyInline">No sales recorded yet. Analytics will remain zero/empty until real transactions exist.</div>}</div></div></section></AppShell>;
}
