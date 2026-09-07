"use client";

import { createContext, useContext } from "react";
import type { AuthProfile } from "../lib/auth/server";

type ClientProfile = Pick<AuthProfile, "id" | "email" | "full_name" | "role" | "status"> | null;

const AuthContext = createContext<{ profile: ClientProfile }>({ profile: null });

export default function AuthProvider({ profile, children }: { profile: ClientProfile; children: React.ReactNode }) {
  return <AuthContext.Provider value={{ profile }}>{children}</AuthContext.Provider>;
}

export function useAuthProfile() {
  return useContext(AuthContext).profile;
}

export function profileDisplayName(profile: ClientProfile) {
  if (!profile) return "Capital Forge";
  const full = String(profile.full_name || "").trim();
  if (full) return full;
  const emailName = String(profile.email || "").split("@")[0].trim();
  return emailName || "Capital Forge";
}

export function profileInitials(profile: ClientProfile) {
  const name = profileDisplayName(profile);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
