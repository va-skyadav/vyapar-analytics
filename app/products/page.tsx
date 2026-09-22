import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppShell, getBusinessContext } from "@/components/app-shell";
import { BusinessQuickNav } from "@/components/business-quick-nav";

async function addProduct(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const ctx = await getBusinessContext(supabase);
  if (!ctx) redirect("/login");
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await supabase.from("products").insert({
    business_id: ctx.business.id,
    name,
    sku: String(formData.get("sku") || "").trim() || null,
    unit: String(formData.get("unit") || "pcs").trim() || "pcs",
    purchase_price: Number(formData.get("purchase_price") || 0),
    selling_price: Number(formData.get("selling_price") || 0),
    reorder_level: Number(formData.get("reorder_level") || 0),
    opening_stock: Number(formData.get("opening_stock") || 0)
  });
  revalidatePath("/products");
}

export default async function ProductsPage() {
  const supabase = await createClient();
  const ctx = await getBusinessContext(supabase);
  if (!ctx) redirect("/create-business");
  const { data: products } = await supabase.from("products")
    .select("id,name,sku,unit,purchase_price,selling_price,reorder_level,opening_stock,is_active")
    .eq("business_id", ctx.business.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell businessName={ctx.business.name} title="Inventory">
      <section className="content">
        <div className="headerRow">
          <div>
            <h2>Products</h2>
            <p>Maintain the product master used by sales and analytics.</p>
          </div>
        </div>
        <BusinessQuickNav active="products" />
        <div className="splitGrid">
          <form action={addProduct} className="card authForm compactForm">
            <h3>Add product</h3>
            <label>Name<input name="name" required /></label>
            <label>SKU <span className="optional">(optional)</span><input name="sku" /></label>
            <div className="twoCol">
              <label>Unit<input name="unit" defaultValue="pcs" /></label>
              <label>Opening stock<input name="opening_stock" type="number" min="0" step="0.01" defaultValue="0" /></label>
            </div>
            <div className="twoCol">
              <label>Purchase price<input name="purchase_price" type="number" min="0" step="0.01" defaultValue="0" /></label>
              <label>Selling price<input name="selling_price" type="number" min="0" step="0.01" defaultValue="0" /></label>
            </div>
            <label>Reorder level<input name="reorder_level" type="number" min="0" step="0.01" defaultValue="0" /></label>
            <button className="authButton" type="submit">Add product</button>
          </form>
          <div className="card tableCard">
            <h3>Product master</h3>
            {products?.length ? <div className="tableWrap">
              <table><thead><tr><th>Name</th><th>SKU</th><th>Buy</th><th>Sell</th><th>Opening stock</th></tr></thead>
                <tbody>{products.map(p => <tr key={p.id}>
                  <td>{p.name}</td><td>{p.sku || "—"}</td>
                  <td>₹{Number(p.purchase_price).toLocaleString("en-IN")}</td>
                  <td>₹{Number(p.selling_price).toLocaleString("en-IN")}</td>
                  <td>{Number(p.opening_stock).toLocaleString("en-IN")} {p.unit}</td>
                </tr>)}</tbody>
              </table>
            </div> : <div className="emptyInline">No products yet. Add the first product to start building real inventory and sales data.</div>}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
