import { NextResponse } from "next/server";
import { getOptiToken } from "@/lib/opti-auth";

export async function GET() {
  try {
    const access_token = await getOptiToken();
    return NextResponse.json({ access_token, expires_in: 300 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
