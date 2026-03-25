# OptiSaaS Inline → Shared Block

A Next.js utility tool for Optimizely CMS SaaS that lets you inspect a page's inline blocks and promote them to reusable shared blocks via the Content Management REST API.

## What it does

1. Fetches any page or block by content key from your Optimizely SaaS instance
2. Displays all inline blocks found in content areas, with nested blocks shown indented beneath their parent
3. Lets you promote any top-level inline block to a shared block with one click
4. Creates the shared block in a designated folder in your CMS (draft status — you publish through the normal editorial workflow)

Nested inline blocks can be promoted recursively: after promoting a parent block, paste its new key back into the tool to promote its children.

## Prerequisites

- Node.js 18+
- An Optimizely CMS SaaS instance with admin access
- An API key from **Settings → API Key** in the CMS

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

```env
OPTIMIZELY_BASE_URL=https://api.cms.optimizely.com
OPTIMIZELY_CLIENT_ID=your_client_id
OPTIMIZELY_CLIENT_SECRET=your_client_secret
OPTIMIZELY_BLOCKS_CONTAINER=your_blocks_folder_key
NEXT_PUBLIC_BLOCKS_CONTAINER=your_blocks_folder_key
```

See [Finding your blocks folder key](#finding-your-blocks-folder-key) below.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Paste a content key (with or without dashes) into the **source input** and click **Fetch**
2. Inline blocks appear as cards. Nested blocks are shown indented below their parent with a "nested" label
3. Enter your **blocks container key** (pre-filled if set in `.env.local`)
4. Click **Promote to Shared Block** on any top-level block
5. The new shared block key appears in the session log — paste it back into the source input to promote its nested children

## Finding your blocks folder key

The Optimizely CMS UI does not show content GUIDs. To find your target folder's key:

1. Create any block manually inside the folder via the CMS UI and note its content key
2. Fetch it via the API: `GET https://api.cms.optimizely.com/preview3/experimental/content/{blockKey}`
3. The `container` field in the response is your folder's key

If you get a `403`, the API client needs permissions on that folder. Go to the folder's **Security** panel in the CMS and add your Client ID with Read, Create, Change, Delete, and Publish rights.

## API notes

All Optimizely API calls are made server-side via Next.js Route Handlers. Credentials never reach the browser.

| Purpose | Endpoint |
| --- | --- |
| Get OAuth token | `POST /oauth/token` (JSON body, not form-encoded) |
| Fetch content with properties | `GET /preview3/experimental/content/{key}/versions` |
| Create shared block | `POST /preview3/experimental/content` |

**Key API quirks discovered during development:**

- The token endpoint is `/oauth/token`, not `/oauth/connect/token`
- Must send `Content-Type: application/json` for the token request — form-encoded is blocked by Cloudflare WAF
- `GET /content/{key}` returns only metadata. Use `/versions` to get full properties including content areas
- Inline blocks have `{ contentType, content }` — shared block references have only `{ reference: "cms://content/..." }`
- POST body uses `properties` (plural) to match the GET response format, despite some docs showing `property` (singular)
- Tokens are valid for 5 minutes — a new token is fetched per request

## Project structure

```text
app/
  page.tsx                  # Main UI (client component)
  api/
    token/route.ts          # GET  — fetch OAuth token
    content/route.ts        # GET  — fetch page/block by content key
    promote/route.ts        # POST — create shared block
lib/
  opti-auth.ts              # Shared getOptiToken() utility
docs/
  build-steps.md            # Detailed build log with API findings
```

## Tech stack

- [Next.js 15](https://nextjs.org) — App Router, Route Handlers
- TypeScript
- Tailwind CSS
