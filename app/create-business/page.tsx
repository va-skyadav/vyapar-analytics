"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CreateBusinessPage() {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkExistingBusiness() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.assign("/login");
        return;
      }

      const { data } = await supabase.from("business_members").select("business_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
      if (data?.business_id) {
        window.location.assign("/");
        return;
      }
      setLoading(false);
    }
    checkExistingBusiness();
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const { data, error } = await supabase.rpc("create_business", {
      p_name: name,
      p_legal_name: legalName || null,
      p_business_type: businessType || null,
      p_industry: industry || null
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    if (!data?.id) {
      setError("Business creation returned no business ID.");
      setSaving(false);
      return;
    }

    window.location.assign("/");
  }

  if (loading) return <main className="authPage"><section className="authCard"><p className="authIntro">Loading workspace...</p></section></main>;

  return (
    <main className="authPage">
      <section className="authCard authWide">
        <div className="authBrand">Vyapar Analytics</div>
        <h1>Create your business</h1>
        <p className="authIntro">This business becomes your data boundary. All analytics, accounting, inventory, HR, tax and prediction data will belong to it.</p>
        <form onSubmit={handleSubmit} className="authForm">
          <label>Business name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sharma Traders" required autoFocus /></label>
          <label>Legal name <span className="optional">(optional)</span><input value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Registered legal name" /></label>
          <label>Business type <span className="optional">(optional)</span><select value={businessType} onChange={e => setBusinessType(e.target.value)}><option value="">Select type</option><option value="sole_proprietorship">Sole proprietorship</option><option value="partnership">Partnership</option><option value="private_limited">Private limited</option><option value="llp">LLP</option><option value="other">Other</option></select></label>
          <label>Industry <span className="optional">(optional)</span><input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Retail, Manufacturing, Services" /></label>
          {error && <div className="formError">{error}</div>}
          <button className="authButton" type="submit" disabled={saving}>{saving ? "Creating business..." : "Create business"}</button>
        </form>
        <form action="/auth/signout" method="post" className="signoutForm"><button type="submit" className="textButton">Sign out</button></form>
      </section>
    </main>
  );
}
