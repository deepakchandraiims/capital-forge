"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createBrowserSupabase } from "../../lib/supabase/client";

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("rate") || m.includes("too many")) return "Too many attempts. Please wait a few minutes and try again.";
  if (m.includes("password")) return "Please choose a stronger password and try again.";
  if (m.includes("email")) return "Please enter a valid email address.";
  return "We could not create the account. Please try again.";
}

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success" | "info"; text: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!fullName.trim()) return setMessage({ tone: "error", text: "Enter your full name." });
    if (!email.trim()) return setMessage({ tone: "error", text: "Enter your email address." });
    if (password.length < 8) return setMessage({ tone: "error", text: "Use a password with at least 8 characters." });
    if (password !== confirmPassword) return setMessage({ tone: "error", text: "The passwords do not match." });

    setBusy(true);
    try {
      const supabase = createBrowserSupabase();
      const origin = window.location.origin;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${origin}/auth/confirm?next=/pending`
        }
      });
      if (error) throw error;

      if (data.session) {
        window.location.replace("/pending");
        return;
      }
      setMessage({
        tone: "success",
        text: "Account created. Check your email and verify it. After verification, your account will wait for administrator approval."
      });
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage({ tone: "error", text: friendlyError(error instanceof Error ? error.message : "") });
    } finally {
      setBusy(false);
    }
  }

  return <main className="cf-auth-page">
    <section className="cf-auth-card">
      <div className="cf-auth-brand"><div className="cf-auth-mark">CF</div><div><b>Capital Forge</b><small>Institutional finance learning workspace</small></div></div>
      <h1>Create your account</h1>
      <p>Sign up with email and password. You will verify your email first, then your account will enter the administrator approval queue.</p>
      <form className="cf-auth-form" onSubmit={submit}>
        <label>Full name<input autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
        <label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <label>Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></label>
        {message && <div className={`cf-auth-message ${message.tone}`}>{message.text}</div>}
        <button className="cf-auth-primary" disabled={busy} type="submit">{busy ? "Creating account…" : "Create account"}</button>
      </form>
      <div className="cf-auth-foot">Already registered? <Link href="/login">Sign in</Link></div>
    </section>
  </main>;
}
