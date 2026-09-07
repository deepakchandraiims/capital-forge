"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "../../lib/supabase/client";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/home";
  if (value.startsWith("/admin")) return "/home";
  return value;
}

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed") || m.includes("not confirmed")) return { state: "email-unverified", text: "Your email is not verified yet. Check your inbox and complete verification first." };
  if (m.includes("rate") || m.includes("too many")) return { state: "rate-limited", text: "Too many sign-in attempts. Please wait a few minutes and try again." };
  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("password")) return { state: "wrong-password", text: "Email or password is incorrect." };
  return { state: "error", text: "Sign-in failed. Please try again." };
}

export default function LoginPage() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(() => {
    return params.get("state") === "session-expired" ? { tone: "info", text: "Your session expired. Sign in again to continue." } : null;
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      window.location.replace(safeNext(params.get("next")));
    } catch (error) {
      const mapped = friendlyError(error instanceof Error ? error.message : "");
      setMessage({ tone: mapped.state === "email-unverified" ? "info" : "error", text: mapped.text });
    } finally {
      setBusy(false);
    }
  }

  return <main className="cf-auth-page">
    <section className="cf-auth-card">
      <div className="cf-auth-brand"><div className="cf-auth-mark">CF</div><div><b>Capital Forge</b><small>Institutional finance learning workspace</small></div></div>
      <h1>Sign in</h1>
      <p>Use your verified Capital Forge email and password. Approval status is checked on the server before any learning workspace opens.</p>
      <form className="cf-auth-form" onSubmit={submit}>
        <label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {message && <div className={`cf-auth-message ${message.tone}`}>{message.text}</div>}
        <button className="cf-auth-primary" disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <div className="cf-auth-foot">Need an account? <Link href="/signup">Create one</Link></div>
    </section>
  </main>;
}
