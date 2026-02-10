/**
 * Fetch user professional history from DB for server-side Bridge and draft logic.
 */

import { createClient } from "@supabase/supabase-js";
import type { MyHistory } from "@/types/integrations";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Get professional history for a user (from user_professional_history).
 * Returns null if not found or no positions; caller can fall back to static my_history.json.
 */
export async function getUserHistory(userId: string): Promise<MyHistory | null> {
  if (!supabaseUrl || !supabaseKey) return null;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("user_professional_history")
    .select("positions, person")
    .eq("user_id", userId)
    .single();
  if (error || !data?.positions?.length) return null;
  return {
    person: (data.person as MyHistory["person"]) ?? {},
    positions: data.positions as MyHistory["positions"],
  };
}
