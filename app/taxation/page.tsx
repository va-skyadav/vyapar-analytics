import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell, getBusinessContext } from "@/components/app-shell";

const money = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

export default async function TaxationPage() {
  const supabase = await createClient();
  const ctx = await getBusinessContext(supabase);
  if (!ctx) redirect("/create-business");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startDate = monthStart.toISOString().slice(0, 10);
  const endDate = monthEnd.toISOString().slice(0, 10);

  const [{ data: configs }, { data: rates }, { data: records }, { data: transactions }, { data: sales }, { data: purchases }] =
    await Promise.all([
      supabase.from("tax_configurations").select("id,tax_type,tax_name,registration_number,rate,filing_frequency,filing_due_day,payment_due_day,is_active").eq("business_id", ctx.business.id).order("tax_name"),
      supabase.from("tax_rates").select("id,tax_type,code,name,rate,effective_from,effective_to,is_active").eq("business_id", ctx.business.id).order("effective_from", { ascending: false }),
      supabase.from("tax_records").select("id,tax_type,period_start,period_end,taxable_amount,input_tax,output_tax,estimated_liability,filed_liability,paid_amount,outstanding_amount,filing_due_date,payment_due_date,status,source").eq("business_id", ctx.business.id).order("period_end", { ascending: false }).limit(20),
      supabase.from("tax_transactions").select("id,tax_record_id,tax_type,taxable_amount,tax_amount,direction,transaction_date,reference_type").eq("business_id", ctx.business.id).gte("transaction_date", monthStart.toISOString()).lt("transaction_date", new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()).order("transaction_date", { ascending: false }),
      supabase.from("sales").select("id,tax,total,sale_date,status").eq("business_id", ctx.business.id).gte("sale_date", monthStart.toISOString()).lt("sale_date", new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()),
      supabase.from("purchases").select("id,tax,total,purchase_date,status").eq("business_id", ctx.business.id).gte("purchase_date", monthStart.toISOString()).lt("purchase_date", new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString())
    ]);

  const outputTax = (sales || []).reduce((sum, s) => sum + Number(s.tax || 0), 0);
  const inputTax = (purchases || []).reduce((sum, p) => sum + Number(p.tax || 0), 0);
  const netTax = outputTax - inputTax;
  const transactionTax = (transactions || []).reduce((sum, t) => sum + Number(t.tax_amount || 0), 0);
  const outstanding = (records || []).reduce((sum, r) => sum + Number(r.outstanding_amount || 0), 0);
  const activeConfigs = (configs || []).filter(c => c.is_active !== false).length;
  const activeRates = (rates || []).filter(r => r.is_active !== false).length;

  const configByType = new Map((configs || []).map(c => [String(c.tax_type), c.tax_name]));
  const upcoming = (records || [])
    .filter(r => r.filing_due_date && r.filing_due_date >= startDate && r.filing_due_date <= endDate)
    .slice(0, 10);

  return (
    <AppShell businessName={ctx.business.name} title="Taxation">
      <section className="content">
        <div className="pageIntro">
          <div>
            <h2>Taxation</h2>
            <p>Track tax configuration, rates, transaction tax and recorded liabilities from your business data.</p>
          </div>
          <span className="period">{now.toLocaleString("en-IN", { month: "long", year: "numeric" })}</span>
        </div>

        <div className="grid">
          <div className="card metricCard">
            <div className="metricLabel">Output Tax</div>
            <div className="metricValue">{money(outputTax)}</div>
            <div className="metricCaption">tax recorded on current-month sales</div>
          </div>
          <div className="card metricCard">
            <div className="metricLabel">Input Tax</div>
            <div className="metricValue">{money(inputTax)}</div>
            <div className="metricCaption">tax recorded on current-month purchases</div>
          </div>
          <div className="card metricCard">
            <div className="metricLabel">Net Tax Movement</div>
            <div className="metricValue">{money(netTax)}</div>
            <div className="metricCaption">output tax minus input tax</div>
          </div>
          <div className="card metricCard">
            <div className="metricLabel">Outstanding Liability</div>
            <div className="metricValue">{money(outstanding)}</div>
            <div className="metricCaption">from recorded tax periods</div>
          </div>
        </div>

        <div className="grid accountingBalances">
          <div className="card metricCard">
            <div className="metricLabel">Tax Configurations</div>
            <div className="metricValue">{activeConfigs}</div>
            <div className="metricCaption">active tax configurations</div>
          </div>
          <div className="card metricCard">
            <div className="metricLabel">Tax Rates</div>
            <div className="metricValue">{activeRates}</div>
            <div className="metricCaption">active rate records</div>
          </div>
          <div className="card metricCard">
            <div className="metricLabel">Tax Transactions</div>
            <div className="metricValue">{transactions?.length || 0}</div>
            <div className="metricCaption">{money(transactionTax)} tax movement this month</div>
          </div>
        </div>

        <div className="analyticsGrid">
          <div className="card tableCard">
            <h3>Tax configuration</h3>
            {configs?.length ? (
              <div className="tableWrap"><table><thead><tr><th>Tax</th><th>Type</th><th>Registration</th><th>Rate</th><th>Frequency</th></tr></thead><tbody>
                {configs.slice(0, 12).map(c => (
                  <tr key={c.id}><td>{c.tax_name}</td><td>{c.tax_type}</td><td>{c.registration_number || "—"}</td><td>{c.rate == null ? "—" : `${c.rate}%`}</td><td>{c.filing_frequency || "—"}</td></tr>
                ))}
              </tbody></table></div>
            ) : <div className="emptyInline">No tax configuration has been added yet.</div>}
          </div>

          <div className="card tableCard">
            <h3>Active tax rates</h3>
            {rates?.length ? (
              <div className="tableWrap"><table><thead><tr><th>Name</th><th>Code</th><th>Type</th><th>Rate</th><th>Effective</th></tr></thead><tbody>
                {rates.slice(0, 12).map(r => (
                  <tr key={r.id}><td>{r.name}</td><td>{r.code || "—"}</td><td>{r.tax_type}</td><td>{r.rate}%</td><td>{new Date(r.effective_from).toLocaleDateString("en-IN")}</td></tr>
                ))}
              </tbody></table></div>
            ) : <div className="emptyInline">No tax rates have been configured yet.</div>}
          </div>
        </div>

        <div className="card tableCard accountingExpenseCard">
          <h3>Recorded tax periods</h3>
          {records?.length ? (
            <div className="tableWrap"><table><thead><tr><th>Tax</th><th>Period</th><th>Taxable Amount</th><th>Output Tax</th><th>Input Tax</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>
              {records.slice(0, 15).map(r => (
                <tr key={r.id}>
                  <td>{configByType.get(String(r.tax_type)) || r.tax_type}</td>
                  <td>{new Date(r.period_start).toLocaleDateString("en-IN")} – {new Date(r.period_end).toLocaleDateString("en-IN")}</td>
                  <td>{money(Number(r.taxable_amount || 0))}</td>
                  <td>{money(Number(r.output_tax || 0))}</td>
                  <td>{money(Number(r.input_tax || 0))}</td>
                  <td>{money(Number(r.outstanding_amount || 0))}</td>
                  <td>{r.status || "—"}</td>
                </tr>
              ))}
            </tbody></table></div>
          ) : <div className="emptyInline">No recorded tax periods yet.</div>}
        </div>

        <div className="card tableCard accountingExpenseCard">
          <h3>Filing due this month</h3>
          {upcoming.length ? (
            <div className="tableWrap"><table><thead><tr><th>Tax</th><th>Filing Due</th><th>Payment Due</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>
              {upcoming.map(r => (
                <tr key={r.id}><td>{configByType.get(String(r.tax_type)) || r.tax_type}</td><td>{new Date(r.filing_due_date!).toLocaleDateString("en-IN")}</td><td>{r.payment_due_date ? new Date(r.payment_due_date).toLocaleDateString("en-IN") : "—"}</td><td>{money(Number(r.outstanding_amount || 0))}</td><td>{r.status || "—"}</td></tr>
              ))}
            </tbody></table></div>
          ) : <div className="emptyInline">No tax filing deadlines are recorded for this month.</div>}
        </div>

        <div className="card accountingNote">
          <h3>Tax data source</h3>
          <p className="muted">This overview uses the business tax configuration, tax rates, tax records, tax transactions, sales and purchases stored in Vyapar Analytics. No tax liability, rate or filing status is fabricated. Tax compliance calculations should be validated against the applicable jurisdiction and current rules.</p>
        </div>
      </section>
    </AppShell>
  );
}
