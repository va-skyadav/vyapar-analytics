import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell, getBusinessContext } from "@/components/app-shell";

const money=(v:number)=>`₹${Math.round(v).toLocaleString("en-IN")}`;

export default async function InventoryPage(){
 const supabase=await createClient(); const ctx=await getBusinessContext(supabase);
 if(!ctx) redirect("/create-business");
 const [{data:products},{data:sales},{data:saleItems},{data:purchases},{data:purchaseItems}]=await Promise.all([
  supabase.from("products").select("id,name,sku,unit,purchase_price,selling_price,reorder_level,opening_stock,is_active,is_service").eq("business_id",ctx.business.id).eq("is_service",false).order("name"),
  supabase.from("sales").select("id,status").eq("business_id",ctx.business.id).eq("status","posted"),
  supabase.from("sale_items").select("product_id,quantity").eq("business_id",ctx.business.id),
  supabase.from("purchases").select("id,status").eq("business_id",ctx.business.id).eq("status","posted"),
  supabase.from("purchase_items").select("product_id,quantity").eq("business_id",ctx.business.id)
 ]);
 const purchased=new Map<string,number>(); (purchaseItems||[]).forEach(x=>purchased.set(x.product_id,(purchased.get(x.product_id)||0)+Number(x.quantity||0)));
 const sold=new Map<string,number>(); (saleItems||[]).forEach(x=>sold.set(x.product_id,(sold.get(x.product_id)||0)+Number(x.quantity||0)));
 const rows=(products||[]).map(p=>{const stock=Number(p.opening_stock||0)+(purchased.get(p.id)||0)-(sold.get(p.id)||0); return {...p,stock}});
 const inventoryValue=rows.reduce((s,p)=>s+Math.max(p.stock,0)*Number(p.purchase_price||0),0);
 const lowStock=rows.filter(p=>Number(p.reorder_level||0)>0&&p.stock<=Number(p.reorder_level));
 return <AppShell businessName={ctx.business.name} title="Inventory"><section className="content">
  <div className="pageIntro"><div><h2>Inventory</h2><p>Track stock position and inventory value from recorded products, purchases and sales.</p></div><a className="action primary" href="/products">Manage products</a></div>
  <div className="grid">
   <div className="card metricCard"><div className="metricLabel">Products</div><div className="metricValue">{rows.length}</div><div className="metricCaption">active product records</div></div>
   <div className="card metricCard"><div className="metricLabel">Units in stock</div><div className="metricValue">{rows.reduce((s,p)=>s+Math.max(p.stock,0),0).toLocaleString("en-IN")}</div><div className="metricCaption">estimated current quantity</div></div>
   <div className="card metricCard"><div className="metricLabel">Inventory Value</div><div className="metricValue">{money(inventoryValue)}</div><div className="metricCaption">at recorded purchase cost</div></div>
   <div className="card metricCard"><div className="metricLabel">Low Stock</div><div className="metricValue">{lowStock.length}</div><div className="metricCaption">at or below reorder level</div></div>
  </div>
  <div className="analyticsGrid">
   <div className="card tableCard"><h3>Stock position</h3>{rows.length?<div className="tableWrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Reorder</th><th>Purchase Cost</th><th>Value</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.sku||"—"}</td><td>{p.stock.toLocaleString("en-IN")} {p.unit}</td><td>{Number(p.reorder_level||0).toLocaleString("en-IN")}</td><td>{money(Number(p.purchase_price||0))}</td><td>{money(Math.max(p.stock,0)*Number(p.purchase_price||0))}</td></tr>)}</tbody></table></div>:<div className="emptyInline">No products yet. Add products to start tracking inventory.</div>}</div>
   <div className="card"><h3>Inventory activity</h3><div className="activityList"><div><strong>{sales?.length||0}</strong><span>posted sales transactions</span></div><div><strong>{purchases?.length||0}</strong><span>posted purchase transactions</span></div></div><p className="muted inventoryNote">Current stock is estimated from opening stock + recorded purchase quantities − recorded sale quantities. Valuation uses each product's recorded purchase price.</p></div>
  </div>
 </section></AppShell>;
}