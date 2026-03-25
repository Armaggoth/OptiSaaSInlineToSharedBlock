import { NextRequest, NextResponse } from "next/server";
import { getOptiToken } from "@/lib/opti-auth";

// GET /api/content?key=<contentKey>
// Fetches the latest published version of a page from Optimizely by its content key.
// Content keys must be provided without dashes (e.g. 20fc7779dc164b3aaa8e506184b426a1).
// Returns the full version object including properties and content area blocks.
export async function GET(request: NextRequest) {
  const contentKey = request.nextUrl.searchParams.get("key");

  if (!contentKey) {
    return NextResponse.json(
      { error: "Missing required query param: key" },
      { status: 400 }
    );
  }

  // Strip dashes in case the user pastes a UUID with dashes
  const normalizedKey = contentKey.replace(/-/g, "");

  const baseUrl = process.env.OPTIMIZELY_BASE_URL;

  try {
    const token = await getOptiToken();

    const response = await fetch(
      `${baseUrl}/preview3/experimental/content/${normalizedKey}/versions`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Content fetch failed (${response.status})`, detail: text },
        { status: response.status }
      );
    }

    const data = await response.json();

    // The versions list is sorted newest first — return the first item (latest version)
    const latestVersion = data.items?.[0] ?? null;

    if (!latestVersion) {
      return NextResponse.json(
        { error: "No versions found for this content key" },
        { status: 404 }
      );
    }

    return NextResponse.json(latestVersion);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
