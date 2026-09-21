"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    window.location.assign("/");
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authBrand">Vyapar Analytics</div>
        <h1>Sign in</h1>
        <p className="authIntro">Access your business intelligence workspace.</p>
        <form onSubmit={handleSubmit} className="authForm">
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} autoComplete="current-password" /></label>
          {error && <div className="formError">{error}</div>}
          <button className="authButton" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        </form>
        <p className="authSwitch">New to Vyapar Analytics? <a href="/signup">Create an account</a></p>
      </section>
    </main>
  );
}
