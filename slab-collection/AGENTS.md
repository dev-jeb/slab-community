<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# slab-collection

A Next.js reader for one collector's Slab collection. It owns no data: every number on screen comes
from the Slab API, and this app's job is to ask well and explain plainly. `README.md` is the user's
document (setup, what each page does); this one is the shape of the code.

Run everything from this directory — `npm run dev`, `npm run build`, `npm run lint`. There is no
test suite yet; `tsc --noEmit` and `lint` are the gates, and both are expected to be silent.

## The one rule that shapes the whole app

**The API key never reaches the browser.** `SLAB_API_KEY` is read in `src/lib/slab/config.ts`, which
is server-only, and every call to Slab goes through `src/lib/slab/client.ts`. The browser talks only
to this app's own `/api/*` routes, which are thin: parse the request, call one client function,
return its JSON. Business logic belongs in `src/lib/`, not in a route.

So there are two fetch layers, and they are not interchangeable:

| Layer | Module | Used by |
|---|---|---|
| this app → Slab | `lib/slab/client.ts` (`slabFetch`) | `/api/*` route handlers, server code |
| browser → this app | `lib/slab/fetch-json.ts` (`fetchJson`) | client components, hooks |

## Errors have three outcomes, not two

`fetchJson` returns `{ status: "ok" | "setup" | "error" }`, and the middle one is the point.
"No API key configured" and "Slab is unreachable" both arrive as a 503, and for a long time every
view read any 503 as the first — so a cold start told a correctly-configured user to go mint a key.

- `MissingApiKeyError` (`lib/slab/errors.ts`) is thrown by `requireSlabConfig`, and only that error
  makes `slabErrorResponse` stamp `code: "missing_api_key"` on the body.
- `fetchJson` maps that code, and nothing else, to `status: "setup"`.
- A view that can render `<SetupPrompt />` branches on `"setup"`. A panel or a row-level write that
  can't calls `failureMessage(result)` instead.

Never reintroduce a bare `response.status === 503` check, and never decide anything by looking for
a substring inside an error message.

## Route handlers

Every `/api/*` route ends the same way:

```ts
try {
  return NextResponse.json(await someClientCall());
} catch (error) {
  return slabErrorResponse(error, "Failed to load X");
}
```

`slabErrorResponse` (`lib/api-response.ts`) is server-only — it imports `next/server`. Client
components take `formatApiDetail` / `isMissingApiKeyError` from `lib/api-errors.ts`, which imports
nothing that can't run in a browser.

## Where things live

- `src/app/` — pages and API routes. Several pages are deliberate redirects (`/portfolio`,
  `/sales`, `/grading`, `/browse`, `/sets`): those were nav tabs once, so they live in bookmarks
  and in links already sent. Don't delete them because they look empty.
- `src/components/ui/` — the pieces shared across pages: `StatCard`, `SegmentedTabs`, `FolderTabs`,
  `CompletionMeter`, `sheen`. Each exists because the same thing was drawn twice and the two copies
  drifted. When you need a second one of something that's already here, use this one.
- `src/lib/` — pure logic: grouping, sorting, filtering, formatting, snapshot diffing. Free of React
  and of `fetch` wherever it can be, which is what makes it the part worth testing first.
- `src/lib/slab/types.ts` — the wire contract, mirroring `slab-schemas`. When the API adds a field,
  it starts here.

## Loading and money

- **Sheen, not spinners.** A value in flight renders `<Sheen>` / `sheenClass` at the size of the
  content that will replace it. A placeholder that doesn't reserve the real size makes the page
  jump, which is worse than showing nothing.
- **Never render a confident wrong number.** A count that hasn't arrived sheens; it does not
  render 0.
- **Say what a number means.** Slab's own house rule, and it applies here: gains and losses get a
  tone (`gainTone`), metrics get their glossary text from the API rather than a hand-written copy.
- **Snapshot drift is not a market move.** `price_change_7d` / `price_change_30d` track the
  appraisal, not the window's sales. Label them that way; the API's glossary text already does.
