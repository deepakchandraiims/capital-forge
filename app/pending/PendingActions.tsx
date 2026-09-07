"use client";

import { useState } from "react";
import { createBrowserSupabase } from "../../lib/supabase/client";

export default function PendingActions({ email, emailVerified }: { email: string; emailVerified: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function resend() {
    if (emailVerified || !email) return;
    setBusy(true);
    setMessage("");
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/pending` }
      });
      if (error) throw error;
      setMessage("Verification email sent. Check your inbox and spam folder.");
    } catch (error) {
      const text = error instanceof Error ? error.message.toLowerCase() : "";
      setMessage(text.includes("rate") ? "Too many requests. Please wait a few minutes before resending." : "Could not resend verification email. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    {!emailVerified && <button className="cf-auth-secondary" type="button" onClick={resend} disabled={busy}>{busy ? "Sending…" : "Resend verification email"}</button>}
    {message && <div className="cf-auth-message info" style={{ marginTop: 10 }}>{message}</div>}
  </>;
}
