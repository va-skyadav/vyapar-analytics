import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell, getBusinessContext } from "@/components/app-shell";

const money = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

export default async function PredictionsPage() {
  const supabase = await createClient();
  const ctx = await getBusinessContext(supabase);
  if (!ctx) redirect("/create-business");

  const now = new Date();
  const [{ data: products }, { data: sales }, { data: forecasts }, { data: runs }, { data: models }, { data: trainingRuns }, { data: recommendations }] =
    await Promise.all([
      supabase.from("products").select("id,name,reorder_level,reorder_quantity,lead_time_days,purchase_price,opening_stock,is_active,is_service").eq("business_id", ctx.business.id).eq("is_active", true).order("name"),
      supabase.from("sales").select("id,sale_date,total,status").eq("business_id", ctx.business.id).gte("sale_date", new Date(now.getTime() - 90 * 86400000).toISOString()).order("sale_date", { ascending: false }),
      supabase.from("forecasts").select("id,product_id,forecast_type,horizon_days,forecast_date,predicted_value,lower_bound,upper_bound,probability,model_name,model_version,training_rows,generated_at,actual_value,accuracy_metrics").eq("business_id", ctx.business.id).order("generated_at", { ascending: false }).limit(30),
      supabase.from("forecast_runs").select("id,model_id,run_date,forecast_start_date,forecast_end_date,horizon_days,status,metrics").eq("business_id", ctx.business.id).order("run_date", { ascending: false }).limit(10),
      supabase.from("ml_models").select("id,model_name,model_type,version,scope,status,features,created_at").eq("business_id", ctx.business.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("ml_training_runs").select("id,model_id,started_at,completed_at,training_start_date,training_end_date,validation_start_date,validation_end_date,rows_used,status,metrics,error_message").eq("business_id", ctx.business.id).order("started_at", { ascending: false }).limit(10),
      supabase.from("recommendations").select("id,product_id,recommendation_type,priority,title,explanation,recommended_quantity,recommended_amount,due_date,source_type,status,created_at").eq("business_id", ctx.business.id).order("created_at", { ascending: false }).limit(15)
    ]);

  const productById = new Map((products || []).map(p => [p.id, p.name]));
  const sales90 = (sales || []).filter(s => String(s.status || "").toLowerCase() !== "cancelled");
  const salesValue = sales90.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const salesDays = new Set(sales90.map(s => String(s.sale_date).slice(0, 10))).size;
  const latestForecast = forecasts?.[0];
  const latestRun = runs?.[0];
  const completedTraining = (trainingRuns || []).filter(r => String(r.status || "").toLowerCase() === "completed").length;
  const activeModels = (models || []).filter(m => !m.status || ["active", "production", "deployed"].includes(String(m.status).toLowerCase())).length;
  const pendingRecommendations = (recommendations || []).filter(r => !["completed", "dismissed", "closed"].includes(String(r.status || "").toLowerCase())).length;

  const dataReady = sales90.length > 0;
  const hasForecasts = (forecasts || []).length > 0;

  return (
    <AppShell businessName={ctx.business.name} title="Predictions">
      <section className="content">
        <div className="pageIntro">
          <div>
            <h2>Predictions</h2>
            <p>Use actual business data and stored ML outputs to understand what may happen next and which decisions need attention.</p>
          </div>
          <span className="period">90-day data window</span>
        </div>

        <div className="grid">
          <div className="card metricCard">
            <div className="metricLabel">Sales Data</div>
            <div className="metricValue">{sales90.length}</div>
            <div className="metricCaption">{salesDays} selling days in the last 90 days</div>
          </div>
          <div className="card metricCard">
            <div className="metricLabel">Sales Value</div>
            <div className="metricValue">{money(salesValue)}</div>
            <div className="metricCaption">actual recorded sales in the data window</div>
          </div>
          <div className="card metricCard">
            <div className="metricLabel">Forecasts</div>
            <div className="metricValue">{forecasts?.length || 0}</div>
            <div className="metricCaption">{hasForecasts ? "stored ML forecast outputs" : "no forecast output recorded yet"}</div>
          </div>
          <div className="card metricCard">
            <div className="metricLabel">Recommendations</div>
            <div className="metricValue">{pendingRecommendations}</div>
            <div className="metricCaption">open decision recommendations</div>
          </div>
        </div>

        <div className="grid accountingBalances">
          <div className="card metricCard">
            <div className="metricLabel">Active Models</div>
            <div className="metricValue">{activeModels}</div>
            <div className="metricCaption">models marked active / production / deployed</div>
          </div>
          <div className="card metricCard">
            <div className="metricLabel">Training Runs</div>
            <div className="metricValue">{completedTraining}</div>
            <div className="metricCaption">completed ML training runs recorded</div>
          </div>
          <div className="card metricCard">
            <div className="metricLabel">Products</div>
            <div className="metricValue">{products?.length || 0}</div>
            <div className="metricCaption">active products available for prediction</div>
          </div>
        </div>

        <div className="analyticsGrid">
          <div className="card tableCard">
            <h3>Latest forecast outputs</h3>
            {forecasts?.length ? (
              <div className="tableWrap"><table><thead><tr><th>Product</th><th>Type</th><th>Forecast Date</th><th>Prediction</th><th>Range</th><th>Model</th></tr></thead><tbody>
                {forecasts.slice(0, 15).map(f => (
                  <tr key={f.id}>
                    <td>{f.product_id ? productById.get(f.product_id) || "Product" : "Business level"}</td>
                    <td>{f.forecast_type}</td>
                    <td>{new Date(f.forecast_date).toLocaleDateString("en-IN")}</td>
                    <td>{f.predicted_value == null ? "—" : Number(f.predicted_value).toLocaleString("en-IN")}</td>
                    <td>{f.lower_bound == null && f.upper_bound == null ? "—" : `${f.lower_bound ?? "—"} – ${f.upper_bound ?? "—"}`}</td>
                    <td>{f.model_name || "—"}{f.model_version ? ` v${f.model_version}` : ""}</td>
                  </tr>
                ))}
              </tbody></table></div>
            ) : <div className="emptyInline">No ML forecast outputs have been generated for this business yet.</div>}
          </div>

          <div className="card tableCard">
            <h3>Decision recommendations</h3>
            {recommendations?.length ? (
              <div className="tableWrap"><table><thead><tr><th>Recommendation</th><th>Product</th><th>Priority</th><th>Quantity</th><th>Due</th></tr></thead><tbody>
                {recommendations.slice(0, 10).map(r => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.product_id ? productById.get(r.product_id) || "Product" : "Business level"}</td>
                    <td>{r.priority || "—"}</td>
                    <td>{r.recommended_quantity == null ? "—" : Number(r.recommended_quantity).toLocaleString("en-IN")}</td>
                    <td>{r.due_date ? new Date(r.due_date).toLocaleDateString("en-IN") : "—"}</td>
                  </tr>
                ))}
              </tbody></table></div>
            ) : <div className="emptyInline">No decision recommendations have been generated yet.</div>}
          </div>
        </div>

        <div className="analyticsGrid">
          <div className="card tableCard">
            <h3>Forecast runs</h3>
            {runs?.length ? (
              <div className="tableWrap"><table><thead><tr><th>Run Date</th><th>Horizon</th><th>Forecast Period</th><th>Status</th></tr></thead><tbody>
                {runs.slice(0, 10).map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.run_date).toLocaleDateString("en-IN")}</td>
                    <td>{r.horizon_days == null ? "—" : `${r.horizon_days} days`}</td>
                    <td>{r.forecast_start_date && r.forecast_end_date ? `${new Date(r.forecast_start_date).toLocaleDateString("en-IN")} – ${new Date(r.forecast_end_date).toLocaleDateString("en-IN")}` : "—"}</td>
                    <td>{r.status || "—"}</td>
                  </tr>
                ))}
              </tbody></table></div>
            ) : <div className="emptyInline">No forecast runs have been recorded yet.</div>}
          </div>

          <div className="card tableCard">
            <h3>ML models</h3>
            {models?.length ? (
              <div className="tableWrap"><table><thead><tr><th>Model</th><th>Type</th><th>Version</th><th>Scope</th><th>Status</th></tr></thead><tbody>
                {models.slice(0, 10).map(m => (
                  <tr key={m.id}><td>{m.model_name}</td><td>{m.model_type}</td><td>{m.version}</td><td>{m.scope || "—"}</td><td>{m.status || "—"}</td></tr>
                ))}
              </tbody></table></div>
            ) : <div className="emptyInline">No ML models have been registered for this business yet.</div>}
          </div>
        </div>

        <div className="card tableCard accountingExpenseCard">
          <h3>Prediction readiness</h3>
          <div className="accountingNote">
            <p><strong>{dataReady ? "Sales data is available." : "More sales data is required."}</strong> {dataReady ? "The platform has actual sales records that can serve as forecasting input." : "No sales records were found in the current 90-day window, so no prediction is presented."}</p>
            <p className="muted">Vyapar Analytics does not display invented forecasts. Prediction values appear here only when an ML forecast has been generated and stored in the forecasts table, together with its model and training metadata where available.</p>
          </div>
        </div>

        <div className="card accountingNote">
          <h3>Prediction intelligence layer</h3>
          <p className="muted">The intended decision flow is Sales Data → Demand Forecast → Stock Forecast → Stock-out Risk → Purchase Recommendation → Cash Requirement. This page is the intelligence surface; the underlying database and ML pipeline remain the source of truth for prediction values.</p>
        </div>
      </section>
    </AppShell>
  );
}
