import { NextRequest, NextResponse } from "next/server";
import { getOptiToken } from "@/lib/opti-auth";

interface PromoteRequest {
  contentType: string;                    // e.g. "MediaAndText3366Block"
  displayName: string;                    // name to give the new shared block
  properties: Record<string, unknown>;    // the block's content (maps from inline block's "content")
  container: string;                      // key of the CMS folder to create the block in
  locale: string;                         // e.g. "en"
}

// POST /api/promote
// Creates a new shared block in Optimizely from an inline block's data.
export async function POST(request: NextRequest) {
  let body: PromoteRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { contentType, displayName, properties, container, locale } = body;

  if (!contentType || !displayName || !properties || !container || !locale) {
    return NextResponse.json(
      { error: "Missing required fields: contentType, displayName, properties, container, locale" },
      { status: 400 }
    );
  }

  const baseUrl = process.env.OPTIMIZELY_BASE_URL;

  try {
    const token = await getOptiToken();

    const response = await fetch(`${baseUrl}/preview3/experimental/content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ contentType, displayName, properties, container, locale }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Create block failed (${response.status})`, detail: text },
        { status: response.status }
      );
    }

    const created = await response.json();
    return NextResponse.json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
