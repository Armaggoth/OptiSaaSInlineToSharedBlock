"use client";

import { useState } from "react";

interface InlineBlock {
  contentAreaName: string;
  index: number;
  name: string;
  contentType: string;
  content: Record<string, unknown>;
  nested: InlineBlock[];   // child inline blocks found inside this block's content arrays
  depth: number;           // 0 = top-level (direct child of a page content area)
}

// Recursively scans an object's values for arrays containing inline blocks.
// depth=0 means we're scanning a page's properties; depth>0 means we're inside a block.
function extractInlineBlocks(
  properties: Record<string, unknown>,
  depth: number = 0
): InlineBlock[] {
  const blocks: InlineBlock[] = [];

  for (const [areaName, areaValue] of Object.entries(properties)) {
    if (!Array.isArray(areaValue)) continue;

    areaValue.forEach((item: unknown, index: number) => {
      if (
        item !== null &&
        typeof item === "object" &&
        "contentType" in item &&
        "content" in item
      ) {
        const block = item as Record<string, unknown>;
        const content = block.content as Record<string, unknown>;

        // Recurse into the block's own content to find nested inline blocks
        const nested = extractInlineBlocks(content, depth + 1);

        blocks.push({
          contentAreaName: areaName,
          index,
          name: typeof block.name === "string" ? block.name : "(unnamed)",
          contentType: block.contentType as string,
          content,
          nested,
          depth,
        });
      }
    });
  }

  return blocks;
}

function hasProperties(obj: object): obj is {
  properties: Record<string, unknown>;
  locale: string;
} {
  return "properties" in obj;
}

// A single block card — renders itself and its nested children indented below.
function BlockCard({
  block,
  containerKey,
  locale,
  onPromoted,
}: {
  block: InlineBlock;
  containerKey: string;
  locale: string;
  onPromoted: (newKey: string, blockName: string) => void;
}) {
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  async function promote() {
    setPromoting(true);
    setPromoteError(null);

    try {
      const response = await fetch("/api/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: block.contentType,
          displayName: block.name,
          properties: block.content,   // "content" in the GET response = "properties" in POST body
          container: containerKey,
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPromoteError(data.error ?? `Failed with status ${response.status}`);
      } else {
        onPromoted(data.key, block.name);
      }
    } catch (err) {
      setPromoteError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPromoting(false);
    }
  }

  const isTopLevel = block.depth === 0;

  return (
    <div className={`${block.depth > 0 ? "ml-6 border-l-2 border-blue-100 pl-4" : ""}`}>
      <div className="bg-white border border-gray-200 rounded p-4 mb-2">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <span className="text-xs text-gray-400 font-mono">
              {block.contentAreaName}[{block.index}]
              {block.depth > 0 && (
                <span className="ml-2 text-blue-400">(nested)</span>
              )}
            </span>
            <p className="font-semibold text-gray-800 text-sm mt-0.5">{block.name}</p>
            <p className="text-xs text-blue-600 font-mono mt-0.5">{block.contentType}</p>
          </div>

          {/* Promote button only on top-level blocks */}
          {isTopLevel && (
            <button
              onClick={promote}
              disabled={promoting || !containerKey.trim()}
              title={!containerKey.trim() ? "Enter a container key above first" : ""}
              className="shrink-0 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-40"
            >
              {promoting ? "Promoting..." : "Promote to Shared Block"}
            </button>
          )}
        </div>

        {promoteError && (
          <p className="text-xs text-red-600 mb-2">{promoteError}</p>
        )}

        <details className="text-xs">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            View block content
          </summary>
          <pre className="mt-2 bg-gray-50 border border-gray-100 rounded p-3 overflow-auto max-h-48 text-gray-700 whitespace-pre-wrap">
            {JSON.stringify(block.content, null, 2)}
          </pre>
        </details>
      </div>

      {/* Render nested blocks indented below */}
      {block.nested.map((child, i) => (
        <BlockCard
          key={i}
          block={child}
          containerKey={containerKey}
          locale={locale}
          onPromoted={onPromoted}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [contentKey, setContentKey] = useState("");
  const [containerKey, setContainerKey] = useState(
    process.env.NEXT_PUBLIC_BLOCKS_CONTAINER ?? ""
  );
  const [result, setResult] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promotedBlocks, setPromotedBlocks] = useState<{ key: string; name: string }[]>([]);

  const inlineBlocks: InlineBlock[] =
    result && hasProperties(result) ? extractInlineBlocks(result.properties) : [];

  const locale = result && hasProperties(result) ? result.locale : "en";

  async function fetchContent() {
    if (!contentKey.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPromotedBlocks([]);

    try {
      const response = await fetch(`/api/content?key=${encodeURIComponent(contentKey.trim())}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? `Request failed with status ${response.status}`);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handlePromoted(newKey: string, blockName: string) {
    setPromotedBlocks((prev) => [...prev, { key: newKey, name: blockName }]);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Opti Inline → Shared Block
        </h1>

        {/* Source page input */}
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            placeholder="Source content key (page or block)"
            value={contentKey}
            onChange={(e) => setContentKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchContent()}
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm font-mono text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={fetchContent}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Fetching..." : "Fetch"}
          </button>
        </div>

        {/* Container key input — needed before promoting */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Blocks container key (required before promoting)"
            value={containerKey}
            onChange={(e) => setContainerKey(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 text-sm rounded">
            {error}
          </div>
        )}

        {/* Promoted blocks log */}
        {promotedBlocks.length > 0 && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-xs font-semibold text-green-700 uppercase mb-2">Promoted this session</p>
            {promotedBlocks.map((b, i) => (
              <div key={i} className="text-xs text-green-800 font-mono">
                ✓ {b.name} → <span className="select-all">{b.key}</span>
              </div>
            ))}
          </div>
        )}

        {/* Inline blocks list */}
        {result && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              Inline Blocks ({inlineBlocks.length} found)
            </h2>
            {inlineBlocks.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No inline blocks found — all items are shared block references.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {inlineBlocks.map((block, i) => (
                  <BlockCard
                    key={i}
                    block={block}
                    containerKey={containerKey}
                    locale={locale}
                    onPromoted={handlePromoted}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Raw JSON */}
        {result && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Raw API Response
            </h2>
            <pre className="bg-gray-900 text-green-300 text-xs p-4 rounded overflow-auto max-h-[40vh] whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
