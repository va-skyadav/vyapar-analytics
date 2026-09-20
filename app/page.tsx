"use client";

import { BarChart3, Calculator, Boxes, Users, ReceiptText, BrainCircuit, Plus, Upload } from "lucide-react";

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
          <div className="business">Business: <strong>Not configured</strong></div>
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
              <p>Create your business and start recording transactions. Analytics will calculate these metrics from the underlying database—no sample or fabricated numbers are shown.</p>
              <div className="actions">
                <button className="action primary"><Plus size={15} /> Create business</button>
                <button className="action"><Upload size={15} /> Import data</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
