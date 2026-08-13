# slab-mcp

An [MCP](https://modelcontextprotocol.io) server for the [slab](https://app.slab.dev-jeb.com)
trading-card API. It runs locally on your machine and gives an AI agent — Claude Code, Claude
Desktop, Cursor, or anything else that speaks MCP — the ability to search the card catalog, read
pricing, and (if you turn it on) manage your collection.

Ask your agent *"what are my three most valuable rookies, and is any of them worth grading?"* and it
has the tools to actually answer.

**Read-only by default.** Write tools are not registered at all unless you opt in.

## Prerequisites

- **Node.js 20+** ([nodejs.org](https://nodejs.org))
- A **slab API key** ([app.slab.dev-jeb.com](https://app.slab.dev-jeb.com) → Account → API Keys)

## Install

Once published, no install step is needed — your MCP client runs it with `npx`.

### Claude Code

```bash
claude mcp add slab --env SLAB_API_KEY=sk_live_your_key_here -- npx -y slab-mcp
```

### Claude Desktop, Cursor, and other config-file clients

Add this to the client's MCP config (`claude_desktop_config.json` for Claude Desktop):

```json
{
  "mcpServers": {
    "slab": {
      "command": "npx",
      "args": ["-y", "slab-mcp"],
      "env": {
        "SLAB_API_KEY": "sk_live_your_key_here"
      }
    }
  }
}
```

Restart the client. You should see a `slab` server with 8 tools.

### From source

```bash
git clone https://github.com/dev-jeb/slab-community.git
cd slab-community/slab-mcp
npm install
npm run build
```

Then point your client at `node /absolute/path/to/slab-community/slab-mcp/dist/index.js` instead of
the `npx` command.

## Configuration

Every setting is an environment variable, set in your MCP client's `env` block. There is no config
file and no way to pass credentials as a tool argument — the model on the other end never sees your
key.

| Variable | Required | Default | Description |
|---|---|---|---|
| `SLAB_API_KEY` | Yes | — | Your slab API key. |
| `SLAB_API_URL` | No | `https://api.slab.dev-jeb.com` | Override for local development. |
| `SLAB_COLLECTOR` | No | your account's default | Collector UUID to act as. |
| `SLAB_MCP_WRITE` | No | `0` | Set to `1` to register the write tools. |
| `SLAB_MCP_TIMEOUT_MS` | No | `30000` | Per-request HTTP timeout. |

### Enabling writes

```json
"env": {
  "SLAB_API_KEY": "sk_live_your_key_here",
  "SLAB_MCP_WRITE": "1"
}
```

With this off, the five write tools are never registered, so the agent cannot call them — that is a
stronger guarantee than telling it not to. With it on, each write tool declares the MCP annotations
(`readOnlyHint`, `destructiveHint`) that let your client prompt you before it runs. Whether your
client actually prompts is up to your client; the annotations only make it possible.

## Tools

**Read** (always available)

| Tool | What it does |
|---|---|
| `search_cards` | Search the catalog. The entry point — most other tools take a UUID from here. |
| `search_sets` | Find a product/release. |
| `get_set_detail` | A set's sealed prices and its most valuable cards. |
| `get_card_pricing` | Fair market value, the individual sales behind it, and the daily series. |
| `search_collection` | Search your own copies, with a financial summary. |
| `get_dashboard` | Collection totals, top cards, and portfolio history. |
| `get_community` | Public leaderboards and activity. |
| `get_vocab` | Every value the API accepts, live from the catalog. |
| `explain_metrics` | What a slab number means, in slab's own words. |

**Write** (only when `SLAB_MCP_WRITE=1`)

| Tool | What it does |
|---|---|
| `add_copy` | Record a card you own. |
| `update_copy` | Change a copy, including recording a sale. |
| `remove_copy` | Delete a copy record. Destructive, no undo. |
| `log_break` | Log a sealed product you opened, so pulls get a real cost basis. |
| `log_lot` | Log a multi-card purchase, same idea. |

## Resources and prompts

Three **resources** let an agent pull reference material without spending a tool call:
`slab://vocab` (every accepted value), `slab://glossary` (what each metric means), and
`slab://openapi` (the full API contract). All three are served from the live API rather than
copied into this repo, so they can't go stale.

Three **prompts** show up in your client's slash menu as starting points:
`appraise-collection`, `research-player`, and `grading-decision`.

## How the tools are designed

Two decisions explain most of the code, and are worth knowing before you extend it.

**Task-shaped, not endpoint-shaped.** The slab API has ~46 routes; this server exposes 13 tools.
Mapping routes 1:1 would put 46 schemas into the agent's context on every single request and make
tool selection worse, not better. Each tool here answers a question a person actually asks, folding
several endpoints where that's the natural unit — `get_card_pricing` is `/market` + `/comps` +
`/price-history`, because "what's it worth" is one question.

**Results are formatted, not dumped.** A tool result is spent out of the agent's context window. A
raw search page is tens of thousands of tokens of JSON, mostly nulls and repeated keys. Results here
render one entity per line with the UUID first, and every paged result says how many rows exist so
the agent knows whether it has seen everything.

**Nothing enumerable or explanatory is written down here.** slab serves both, so this server asks:
`get_vocab` for values (statuses, sort keys, and the live catalog dimensions that grow with every
seeded set) and `explain_metrics` for what a number means. No tool description lists a brand, team,
attribute, or finish, and none writes its own definition of `priced_coverage` — a copy in this repo
would rot, and a hand-written gloss would drift from what the portal and CLI show the same user.
Tools that report figures point the agent at `explain_metrics`, responses that embed their own
glossary render it inline, and a test fails the build if a metric-bearing tool stops doing either.

Two rules from the slab data model are written into the tool descriptions rather than left to the
agent to figure out, because getting them wrong produces a confident false statement about someone's
money:

- **Prices are appraisals, not tickers.** A fair market value is a trimmed median of the trailing 90
  days, so differencing two snapshots measures how the *appraisal* drifted — not what the market did
  over that window. Real market movement comes from counting comps.
- **The portfolio series is as-of.** It steps up when you buy a card, so differencing two points
  mixes purchases with price movement and is not a return.

## Extending it

The whole surface is a registry. Adding a tool is a new module plus one line:

```
src/
  tools/
    index.ts       <- THE REGISTRY: read tools, write tools, registration loop
    types.ts       <- the ToolModule contract + annotation presets
    filters.ts     <- the shared card filter grammar, defined once
    catalog.ts     collection.ts     pricing.ts     writes.ts     meta.ts
  resources/index.ts   <- add a resource: one entry in RESOURCES
  prompts/index.ts     <- add a prompt: one entry in PROMPTS
  client.ts        <- HTTP, auth, timeouts, error shapes. Knows nothing about cards.
  index.ts         <- wiring only. Adding a tool never touches this file.
```

To add a tool:

```ts
export const getMyThing = defineTool({
  name: 'get_my_thing',
  title: 'Get my thing',
  description: 'When to call this, and what the numbers mean. Name the tool that produces any UUID this one takes.',
  inputSchema: z.object({
    thing_uuid: z.string().describe('Thing UUID, from search_things.'),
  }),
  annotations: READ_ONLY,   // or CREATES / UPDATES / DELETES
  mutates: false,           // true puts it behind SLAB_MCP_WRITE
  async handler(input, ctx) {
    const thing = await ctx.client.request<Thing>('GET', `/things/${input.thing_uuid}`);
    return text(`...`);
  },
});
```

Then add it to the array in `tools/index.ts`. That's it — registration, argument validation, error
handling, and the write gate are all handled by the loop.

`mutates` and `annotations` are required, not optional, because a write tool that looks read-only
gets no confirmation prompt from the host. `npm test` enforces that they agree, along with the
things prose can't check for itself: unique snake_case names, a description substantial enough to
route on, a `.describe()` on every input field, destructive tools marked destructive, and no tool
description that hardcodes a live catalog vocabulary or calls appraisal drift a market move.

## Development

```bash
npm install
npm run dev        # run against the API without building
npm test           # offline: no network, no key, no server
npm run typecheck
npm run build
```

**Never write to stdout.** In a stdio MCP server, stdout is the protocol — one stray `console.log`
corrupts the JSON-RPC stream and the client drops the connection with an error that points nowhere
near the cause. Diagnostics go to stderr, which your client surfaces as the server's log.

To inspect the server by hand:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Releasing

Publishing runs on [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC).
There is **no `NPM_TOKEN` anywhere in this repo** — the workflow mints a short-lived identity token
that npm exchanges for a credential good for one publish, and attaches a provenance attestation
linking the tarball to the exact commit that built it. Nothing long-lived exists to leak.

The trusted publisher is configured as:

```
dev-jeb/slab-community  ->  slab-mcp-publish.yml  ->  env npm-publish  ->  npm publish
```

**All four of those must agree**, and the workflow filename is load-bearing: npm matches on the
filename alone (no path, and it must live directly in `.github/workflows/`). Renaming or moving
`slab-mcp-publish.yml` breaks publishing with an auth error that never mentions the filename, so
change the npm side first. The `environment: npm-publish` line in the publish job is what puts the
environment claim in the OIDC token — remove it and npm rejects the publish.

One publish workflow per tool, matching this repo's one-directory-one-tool rule: a new publishable
tool gets its own `<tool>-publish.yml` and its own trusted publisher, and nothing here changes.

Two remaining one-time steps:

1. **OIDC cannot perform a package's first publish** — npm requires the package to exist before a
   trusted publisher can be attached. Run `cd slab-mcp && npm publish` once by hand, logged in as
   the package owner. Every release after that goes through CI.
2. GitHub → **Settings → Environments → `npm-publish`** → add yourself as a required reviewer, so
   each release pauses for a human click and a mistaken tag cannot ship on its own.

After that, releasing is:

```bash
# bump "version" in slab-mcp/package.json, then:
git commit -am "slab-mcp 0.1.1"
git tag slab-mcp-v0.1.1
git push origin main slab-mcp-v0.1.1
```

The tag is namespaced per tool, so each directory in this repo releases on its own schedule. The
workflow re-runs typecheck, tests, and build, and refuses to publish if the tag disagrees with
`package.json` — npm never lets a version number be reused, so that mistake is unfixable.

## Limits and caveats

- Read-only unless you opt in, and it acts for exactly one collector.
- No caching. Every tool call is a live request; `slab://openapi` is large, so fetch it deliberately.
- stdio transport only. It is meant to run on your machine next to your agent, not to be hosted.
- Tool inputs cover the well-trodden subset of slab's filter grammar. The full contract is always
  `GET /openapi.json` — if this server and the spec disagree, the spec is right.

## License

MIT, same as the rest of this repo.

Maintained by [@dev-jeb](https://github.com/dev-jeb).
