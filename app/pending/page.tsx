import { redirect } from "next/navigation";
import { getAuthContext } from "../../lib/auth/server";
import PendingActions from "./PendingActions";

function statusCopy(status: string, emailVerified: boolean) {
  if (!emailVerified) return { icon: "@", title: "Verify your email", text: "Your account exists, but your email is not verified yet. Complete email verification before administrator approval can be granted." };
  if (status === "rejected") return { icon: "×", title: "Account request rejected", text: "This account was reviewed and rejected. You can still sign out. Contact the administrator outside Capital Forge if you believe this needs another review." };
  if (status === "suspended") return { icon: "!", title: "Account suspended", text: "Access to the learning workspace is suspended. Your existing progress is preserved and has not been deleted." };
  return { icon: "…", title: "Waiting for administrator approval", text: "Your email is verified and your account is in the approval queue. Once approved, the full learning workspace will unlock automatically at your next request." };
}

export default async function PendingPage() {
  const auth = await getAuthContext();
  if (!auth.user) redirect("/login");
  if (auth.profile?.status === "approved" && auth.user.emailVerified) redirect("/home");

  const status = auth.profile?.status || "pending";
  const copy = statusCopy(status, auth.user.emailVerified);
  return <main className="cf-auth-page">
    <section className="cf-auth-card">
      <div className="cf-auth-brand"><div className="cf-auth-mark">CF</div><div><b>Capital Forge</b><small>Account access</small></div></div>
      <h1>{copy.title}</h1>
      <p>{copy.text}</p>
      <div className="cf-auth-status"><i>{copy.icon}</i><div><b>{auth.user.email}</b><span>Status: {auth.user.emailVerified ? status : "email unverified"}</span></div></div>
      <div className="cf-auth-details">
        <div><span>Email verified</span><b>{auth.user.emailVerified ? "Yes" : "No"}</b></div>
        <div><span>Approval status</span><b>{status}</b></div>
        {auth.profile?.created_at && <div><span>Account created</span><b>{new Date(auth.profile.created_at).toLocaleString()}</b></div>}
      </div>
      <PendingActions email={auth.user.email || ""} emailVerified={auth.user.emailVerified} />
      <form method="post" action="/auth/signout" style={{ marginTop: 10 }}><button className="cf-auth-secondary" style={{ width: "100%" }} type="submit">Sign out</button></form>
    </section>
  </main>;
}
