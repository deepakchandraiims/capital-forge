import type { Metadata } from "next";
import "./globals.css";
import "./prepmate.css";
import "./advanced.css";
import "./advanced-workstation.css";
import "./interview.css";
import "./knowledge-vault.css";
import "./knowledge-dashboard.css";
import "./auth.css";
import NavRouteBridge from "./NavRouteBridge";
import PerformanceWarmup from "./PerformanceWarmup";
import AuthProvider from "./AuthProvider";
import AccountStorageBoundary from "./AccountStorageBoundary";
import { getAuthContext } from "../lib/auth/server";

export const metadata: Metadata = {
  title: "Capital Forge",
  description: "Institutional finance practice platform for IB, PE, VC, private credit, modeling and capital markets."
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext();
  const profile = auth.profile
    ? {
        id: auth.profile.id,
        email: auth.profile.email,
        full_name: auth.profile.full_name,
        role: auth.profile.role,
        status: auth.profile.status
      }
    : null;

  return (
    <html lang="en">
      <body>
        <AuthProvider profile={profile}>
          <AccountStorageBoundary profileId={profile?.id || null} role={profile?.role || null}>
            <NavRouteBridge />
            <PerformanceWarmup enabled={profile?.status === "approved"} />
            {children}
          </AccountStorageBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
