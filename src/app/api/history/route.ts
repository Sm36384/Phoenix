import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { MyHistory } from "@/types/integrations";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_professional_history")
    .select("positions, person")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const history: MyHistory = {
    person: (data?.person as MyHistory["person"]) ?? {},
    positions: (data?.positions as MyHistory["positions"]) ?? [],
  };
  return NextResponse.json(history);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as MyHistory;
  const { error } = await supabase
    .from("user_professional_history")
    .upsert(
      {
        user_id: user.id,
        positions: body.positions ?? [],
        person: body.person ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
