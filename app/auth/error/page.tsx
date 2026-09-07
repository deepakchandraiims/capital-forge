import Link from "next/link";

export default function AuthErrorPage() {
  return <main className="cf-auth-page">
    <section className="cf-auth-card">
      <div className="cf-auth-brand"><div className="cf-auth-mark">CF</div><div><b>Capital Forge</b><small>Authentication</small></div></div>
      <h1>Verification could not be completed</h1>
      <p>The verification link may have expired or already been used. Sign in again, or return to signup if you still need an account.</p>
      <div className="cf-auth-actions"><Link className="cf-auth-secondary" style={{display:"grid",placeItems:"center",textDecoration:"none"}} href="/login">Sign in</Link><Link className="cf-auth-primary" style={{display:"grid",placeItems:"center",textDecoration:"none"}} href="/signup">Create account</Link></div>
    </section>
  </main>;
}
