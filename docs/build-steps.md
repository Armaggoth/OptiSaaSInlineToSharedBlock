# OptiInlineToSharedBlock — Build Steps

A Next.js utility app that promotes inline blocks from one Optimizely CMS SaaS page to a shared block and adds it to a target page.

---

## Step 1 — Scaffold the Next.js project ✅

Scaffolded a Next.js 15 project with:

- TypeScript
- Tailwind CSS
- App Router

Files created: `app/`, `next.config.ts`, `tsconfig.json`, `package.json`, `.gitignore`, `postcss.config.mjs`

---

## Step 2 — Set up .env.local with Optimizely credentials

### How to get your Optimizely SaaS API credentials

1. Log in to your Optimizely CMS SaaS instance as an administrator.
2. Navigate to **Settings → API Key**.
3. Copy the **Client ID** and **Client Secret** — the secret is only shown once.

> Note: No scopes need to be configured — the API key grants full access.

### .env.local variables to create

```env
OPTIMIZELY_BASE_URL=https://api.cms.optimizely.com
OPTIMIZELY_CLIENT_ID=your_client_id_here
OPTIMIZELY_CLIENT_SECRET=your_client_secret_here
```

Files created/modified: `.env.local`, `.gitignore` (verified)

---

## Step 3 — Route Handler: fetch OAuth token ✅

Created `app/api/token/route.ts` — a server-side GET handler that POSTs to:
`POST https://api.cms.optimizely.com/oauth/token`

With JSON body: `{ grant_type, client_id, client_secret }`. Returns `access_token` (JWT, valid 5 min) and `expires_in`.

Notes:

- Correct path is `/oauth/token`, NOT `/oauth/connect/token`
- Must send `Content-Type: application/json` (form-encoded triggers Cloudflare WAF block)
- Token includes `siteUrl` claim revealing the instance: `https://app-bhns01saas32d4ft002.cms.optimizely.com/`

---

## Step 4 — Route Handler: fetch page by content key ✅

Created `app/api/content/route.ts` and `lib/opti-auth.ts`.

- `GET /api/content?key=<contentKey>` — accepts content key with or without dashes, fetches a token, calls Optimizely, returns the latest version's full JSON including properties.
- Token logic extracted to `lib/opti-auth.ts` (`getOptiToken()`) so all route handlers share it.

Key findings from API exploration:

- `GET /content/{key}` returns only metadata (no properties).
- `GET /content/{key}/versions` returns full content including properties and content area blocks — this is the correct endpoint.
- **Inline blocks** appear in content area arrays as objects with `contentType` + `content` properties.
- **Shared block references** appear as objects with only a `reference` field (`cms://content/{key}`).

---

## Step 5 — UI: enter content key and view raw JSON ✅

Replaced `app/page.tsx` with an interactive client component:

- Text input for content key (accepts dashes or no dashes)
- "Fetch Page" button (also triggered by Enter key)
- Raw JSON rendered in a scrollable `<pre>` block
- Error banner shown if the API call fails

React patterns used:

- `"use client"` — marks the file as a browser-side interactive component
- `useState` — tracks input value, API result, loading state, and error message
- Calls `/api/content?key=...` (our own Route Handler) — credentials never leave the server

---

## Step 6 — Parse and display inline blocks ✅

Updated `app/page.tsx` with `extractInlineBlocks()` — scans all properties arrays for items that have a `contentType` field (inline blocks). Items with only a `reference` field are shared blocks and are skipped.

Each inline block card shows:

- Which content area it belongs to and its position index
- Display name and contentType
- Collapsible view of the block's content properties

Inline block structure (confirmed from API): `{ name, contentType, content: {...} }`
Shared block reference structure (skipped): `{ reference: "cms://content/..." }`

---

## Step 7 — Promote to Shared Block ✅

> ⚠️ **This step POSTs to the Optimizely API and creates content.**

Created `app/api/promote/route.ts` — accepts POST with `{ contentType, displayName, property, container, locale }` and creates a new shared block in Optimizely.

Updated `app/page.tsx` with:

- A "Blocks container key" input (pre-filled from `NEXT_PUBLIC_BLOCKS_CONTAINER` env var)
- "Promote to Shared Block" button on each top-level inline block card
- A session log showing newly promoted block keys
- Nested blocks display with indentation but no promote button (must promote parent first)

Added to `.env.local`:

- `OPTIMIZELY_BLOCKS_CONTAINER` — container key of the "Promoted Blocks" folder (server-side)
- `NEXT_PUBLIC_BLOCKS_CONTAINER` — same value, exposed to the browser to pre-fill the UI input

### How to find the blocks folder container key

The Optimizely CMS UI does not display content GUIDs directly. The folder lives under
"For All Applications" which is outside the regular site tree and requires explicit API permissions.

**Steps taken to find it:**

1. Created a dummy shared block manually inside the target folder ("Promoted Blocks" under "For All Applications") via the CMS UI — noted its content key from the creation dialog.
2. Called `GET /preview3/experimental/content/{blockKey}` — the `container` field in the response is the parent folder's key.
3. Got a 403 initially — the API client had no access to the "For All Applications" section.
4. Fixed by going to **the folder's Security/Permissions panel in the CMS** and adding the API client ID (`a3503fbdcc2f4330bd7fa18c4b8c62cb`) with Read, Create, Change, Delete, and Publish rights.
5. Retried the fetch — `container` value `d4216f3fae334363b4b717652a742a25` is the "Promoted Blocks" folder key.

> Note: `NEXT_PUBLIC_` prefix is required for Next.js to expose an env variable to browser-side code. The container key is not a secret so this is safe.

---

## Step 8 — Add to target page

> ⚠️ **This step PATCHes the Optimizely API and modifies existing content.**

Add a target page input. Create a Route Handler that GETs the target page then PATCHes it to append the new shared block reference.

---

## Step 9 — Error handling and status messages

Add basic error handling and user-facing status messages throughout the UI for all API operations.
