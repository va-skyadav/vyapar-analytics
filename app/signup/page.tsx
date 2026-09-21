"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      window.location.assign("/create-business");
      return;
    }

    setMessage("Account created. Check your email to confirm your account, then sign in.");
    setLoading(false);
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authBrand">Vyapar Analytics</div>
        <h1>Create account</h1>
        <p className="authIntro">Start your business intelligence workspace.</p>
        <form onSubmit={handleSubmit} className="authForm">
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} autoComplete="new-password" /></label>
          <label>Confirm password<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your password" required minLength={6} autoComplete="new-password" /></label>
          {error && <div className="formError">{error}</div>}
          {message && <div className="formMessage">{message}</div>}
          <button className="authButton" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
        </form>
        <p className="authSwitch">Already have an account? <a href="/login">Sign in</a></p>
      </section>
    </main>
  );
}
