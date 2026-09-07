import Link from "next/link";
import { requireAdmin } from "../../../lib/auth/server";
import { createServerSupabase } from "../../../lib/supabase/server";
import { setUserStatus } from "./actions";

type AdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "user";
  status: "pending" | "approved" | "rejected" | "suspended";
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  email_verified: boolean;
  last_sign_in_at: string | null;
};

export default async function AdminUsersPage() {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("cf003_admin_list_users");
  if (error) throw new Error(error.message);
  const users = (data || []) as AdminUserRow[];
  const pending = users.filter((u) => u.status === "pending").length;

  return <main className="cf-admin-page">
    <div className="cf-admin-wrap">
      <header className="cf-admin-head"><div><h1>User approval queue</h1><p>{pending} pending · {users.length} total accounts</p></div><div><Link href="/home" style={{fontSize:11,fontWeight:800,color:"#1268f3",textDecoration:"none"}}>← Back to Capital Forge</Link></div></header>
      <section className="cf-admin-table">
        <div className="cf-admin-row head"><span>User</span><span>Email verified</span><span>Status</span><span>Created</span><span>Actions</span></div>
        {users.length === 0 ? <div style={{padding:24,color:"#728096",fontSize:12}}>No accounts yet.</div> : users.map((user) => <div className="cf-admin-row" key={user.id}>
          <div className="cf-admin-user"><b>{user.full_name || "Unnamed user"}</b><small>{user.email}{user.role === "admin" ? " · ADMIN" : ""}</small></div>
          <span>{user.email_verified ? "Verified" : "Not verified"}</span>
          <span className={`cf-admin-badge ${user.status}`}>{user.status}</span>
          <span>{new Date(user.created_at).toLocaleDateString()}</span>
          <div className="cf-admin-buttons">
            {user.role === "admin" ? <span style={{color:"#718097"}}>Protected admin account</span> : <>
              <form action={setUserStatus.bind(null, user.id, "approved")}><button className="approve" disabled={!user.email_verified}>Approve</button></form>
              <form action={setUserStatus.bind(null, user.id, "rejected")}><button className="reject">Reject</button></form>
              <form action={setUserStatus.bind(null, user.id, "suspended")}><button>Suspend</button></form>
              {user.status !== "pending" && <form action={setUserStatus.bind(null, user.id, "pending")}><button>Set pending</button></form>}
            </>}
          </div>
        </div>)}
      </section>
    </div>
  </main>;
}
