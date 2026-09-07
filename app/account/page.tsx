import Link from "next/link";
import { requireApproved } from "../../lib/auth/server";
import AccountForm from "./AccountForm";

export default async function AccountPage() {
  const auth = await requireApproved();
  return <main className="cf-auth-page">
    <section className="cf-auth-card">
      <div className="cf-auth-brand"><div className="cf-auth-mark">CF</div><div><b>Capital Forge</b><small>Your account</small></div></div>
      <h1>Account</h1>
      <p>Your identity and access state are read from the server. Learning history is isolated to this account.</p>
      <AccountForm id={auth.profile.id} email={auth.profile.email} fullName={auth.profile.full_name || ""} role={auth.profile.role} status={auth.profile.status} />
      {auth.profile.role === "admin" && <div className="cf-auth-foot"><Link href="/admin/users">Open admin user approval queue</Link></div>}
      <div className="cf-auth-foot"><Link href="/home">← Back to Capital Forge</Link></div>
    </section>
  </main>;
}
