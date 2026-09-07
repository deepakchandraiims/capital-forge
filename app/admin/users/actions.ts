"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/auth/server";
import { createServerSupabase } from "../../../lib/supabase/server";

export async function setUserStatus(userId: string, status: "approved" | "rejected" | "suspended" | "pending") {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("cf003_admin_set_user_status", { p_user_id: userId, p_status: status });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}
