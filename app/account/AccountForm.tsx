"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabase } from "../../lib/supabase/client";

export default function AccountForm({ id, email, fullName, role, status }: { id: string; email: string; fullName: string; role: string; status: string }) {
  const [name, setName] = useState(fullName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.from("profiles").update({ full_name: name.trim() || null }).eq("id", id);
      if (error) throw error;
      setMessage("Profile updated.");
      window.setTimeout(() => window.location.reload(), 250);
    } catch {
      setMessage("Could not update your profile.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="cf-auth-details">
      <div><span>Email</span><b>{email}</b></div>
      <div><span>Role</span><b>{role}</b></div>
      <div><span>Status</span><b>{status}</b></div>
    </div>
    <form className="cf-auth-form" onSubmit={save}>
      <label>Full name<input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
      {message && <div className={`cf-auth-message ${message === "Profile updated." ? "success" : "error"}`}>{message}</div>}
      <button className="cf-auth-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save profile"}</button>
    </form>
    <form method="post" action="/auth/signout" style={{ marginTop: 10 }}><button className="cf-auth-secondary" style={{ width: "100%" }} type="submit">Sign out</button></form>
  </>;
}
