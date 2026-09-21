"use client";

import { useEffect, useState } from "react";
import { BarChart3, Calculator, Boxes, Users, ReceiptText, BrainCircuit, Plus, Upload, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const modules = [
  { label: "Analytics", icon: BarChart3, active: true },
  { label: "Accounting", icon: Calculator },
  { label: "Inventory", icon: Boxes },
  { label: "HR", icon: Users },
  { label: "Taxation", icon: ReceiptText },
  { label: "Predictions", icon: BrainCircuit }
];

const metrics = ["Sales", "Revenue", "Gross Profit", "Expenses", "Cash", "Receivables", "Payables", "Inventory Value"];

export default function Dashboard() {
  const supabase = createClient();
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkspace() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.assign("/login");
        return;
      }

      const { data: membership, error } = await supabase
        .from("business_members")
        .select("business_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (error || !membership?.business_id) {
        window.location.assign("/create-business");
        return;
      }

      const { data: business } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", membership.business_id)
        .single();

      if (!business) {
        window.location.assign("/create-business");
        return;
      }

      setBusinessName(business.name);
      setLoading(false);
    }

    loadWorkspace();
  }, [supabase]);

  if (loading) {
    return <main className="authPage"><section className="authCard"><p className="authIntro">Loading workspace...</p></section></main>;
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand">Vyapar Analytics<span>Business Intelligence Platform</span></div>
        <nav className="nav" aria-label="Primary navigation">
          {modules.map(({ label, icon: Icon, active }) => (
            <a key={label} href="#" className={`navItem ${active ? "active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} />
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebarFooter">Data-driven business decisions</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>Analytics</h1>
          <div className="topbarRight">
            <div className="business">Business: <strong>{businessName}</strong></div>
            <form action="/auth/signout" method="post">
              <button className="signoutButton" type="submit" title="Sign out"><LogOut size={16} /></button>
            </form>
          </div>
        </header>

        <section className="content">
          <div className="headerRow">
            <div>
              <h2>Business overview</h2>
              <p>Your analytics dashboard will be populated from your business data.</p>
            </div>
            <select className="period" defaultValue="30">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
            </select>
          </div>

          <div className="grid">
            {metrics.map((metric) => (
              <div className="card" key={metric}>
                <div className="metricLabel">{metric}</div>
                <div className="metricValue">—</div>
              </div>
            ))}
          </div>

          <div className="card empty">
            <div>
              <h3>No business data yet</h3>
              <p>Start recording transactions. Analytics will calculate these metrics from the underlying database—no sample or fabricated numbers are shown.</p>
              <div className="actions">
                <button className="action primary" onClick={() => window.location.assign("/create-business")}><Plus size={15} /> Business settings</button>
                <button className="action"><Upload size={15} /> Import data</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
