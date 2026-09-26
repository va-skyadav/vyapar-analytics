import { BarChart3, Calculator, Boxes, Users, ReceiptText, BrainCircuit, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import BrandDisplay from "./brand-display";

const modules = [
  { label: "Analytics", href: "/", icon: BarChart3 },
  { label: "Accounting", href: "/accounting", icon: Calculator },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "HR", href: "/hr", icon: Users },
  { label: "Taxation", href: "/taxation", icon: ReceiptText },
  { label: "Predictions", href: "/predictions", icon: BrainCircuit }
];

export function AppShell({ businessName, title, children }: { businessName: string; title: string; children: ReactNode }) {
  return <div className="dashboard">
    <aside className="sidebar">
      <BrandDisplay />
      <nav className="nav" aria-label="Primary navigation">
        {modules.map(({ label, href, icon: Icon }) => <a key={label} href={href} className={`navItem ${title === label ? "active" : ""}`}><Icon size={18} strokeWidth={1.8}/>{label}</a>)}
      </nav>
      <div className="sidebarFooter">Data-driven business decisions</div>
    </aside>
    <main className="main">
      <header className="topbar"><h1>{title}</h1><div className="topbarRight"><div className="business">Business: <strong>{businessName}</strong></div><form action="/auth/signout" method="post"><button className="signoutButton" type="submit" title="Sign out"><LogOut size={16}/></button></form></div></header>
      {children}
    </main>
  </div>;
}

export async function getBusinessContext(supabase: Awaited<ReturnType<(typeof import("@/lib/supabase/server"))["createClient"]>>) {
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) return null;
  const userId = claimsData.claims.sub as string;
  const { data: membership } = await supabase.from("business_members").select("business_id").eq("user_id", userId).eq("status","active").limit(1).maybeSingle();
  if (!membership?.business_id) return null;
  const { data: business } = await supabase.from("businesses").select("id,name").eq("id",membership.business_id).single();
  return business ? { userId, business } : null;
}
