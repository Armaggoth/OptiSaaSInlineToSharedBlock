// Shared utility for fetching an Optimizely OAuth token server-side.
// Import this in any Route Handler that needs to call the Optimizely API.

export async function getOptiToken(): Promise<string> {
  const baseUrl = process.env.OPTIMIZELY_BASE_URL;
  const clientId = process.env.OPTIMIZELY_CLIENT_ID;
  const clientSecret = process.env.OPTIMIZELY_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error("Missing Optimizely credentials in environment variables");
  }

  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.access_token as string;
}
