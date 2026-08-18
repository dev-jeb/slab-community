# slab community

Open-source tools built on top of the [slab](https://app.slab.dev-jeb.com) trading-card API.

slab is a hosted API for trading-card catalog, collection, and pricing data. **This repo is not
slab.** The API is closed source and runs as a hosted
service. What lives here is the stuff people build *against* it — front ends, clients, scripts,
integrations — released openly so nobody has to write the same wrapper twice.

If you're looking for the API itself: [`api.slab.dev-jeb.com/docs`](https://api.slab.dev-jeb.com/docs).

## The one rule: one directory, one self-contained tool

Every top-level directory in this repo is a complete, independent tool. The only exception is
`.github/`, which holds repo-wide templates and workflows.

Self-contained means all of the following:

- **Its own README.** What it does, who maintains it, how to run it, what it needs from slab.
- **Its own dependencies and lockfile.** There is no root `package.json`, no root `pyproject.toml`,
  no shared build system. Pick whatever stack suits the tool.
- **Its own tests and CI.** If it has a workflow, that workflow is path-filtered to its directory so
  one tool's red build never blocks another's.
- **No cross-directory imports.** Nothing in `foo/` may import from `bar/`. If two tools need the
  same code, publish it (npm, PyPI) and depend on the published package.
- **Deletable.** `rm -rf <directory>` must leave every other tool working.

The reason is boring and practical: tools here will be written by different people, in different
languages, at different levels of polish, and abandoned at different times. Anything shared across
directories turns one person's Tuesday refactor into everyone else's problem.

## Tools

| Directory | What it is | Stack | Maintainer |
| --- | --- | --- | --- |
| [`slab-collection/`](slab-collection/) | Web front end for your collection — gallery, portfolio dashboard, player research, per-card pricing | Next.js, React, Tailwind | [@Tdtemplev](https://github.com/Tdtemplev) |
| [`slab-mcp/`](slab-mcp/) | Local MCP server — gives an AI agent (Claude Code, Claude Desktop, Cursor…) tools to search the catalog, read pricing, and manage a collection | TypeScript, Node | [@dev-jeb](https://github.com/dev-jeb) |

## Before you build

You'll need an API key: sign in at [app.slab.dev-jeb.com](https://app.slab.dev-jeb.com) → Account →
API Keys. Keys are per-account and act for a collector.

The contract is machine-readable and always current — build against it, don't hand-copy it:

- **`GET https://api.slab.dev-jeb.com/openapi.json`** — the full OpenAPI spec, and the authoritative
  API reference. Browsable as [Swagger](https://api.slab.dev-jeb.com/docs) and
  [ReDoc](https://api.slab.dev-jeb.com/redoc).
- **`GET /vocab`** — every enumerable value the API accepts (enums, sort grammars, live catalog
  dimensions). Render this instead of hardcoding a copy; it grows as sets are seeded.
- **`GET /glossary`** — plain-language descriptions of every metric the API returns, so your UI can
  explain a number without you inventing the wording.

Existing clients you can build on rather than start from scratch:

- **`pip install slab-schemas`** — the pydantic request/response models (pydantic only, no server).
- **`pip install slab-cli`** — the terminal client (`slab`).

**Keep API keys on the server.** A key in browser-side code is visible to anyone who opens devtools,
and it carries the caller's whole account. Proxy through your own backend (a Next.js route handler,
a small server, anything) so the browser never holds one. The API's CORS policy is an allowlist, so
direct browser calls from an arbitrary origin won't work anyway.

## How to contribute

Contributions are welcome, including half-finished ones. Full details in
[CONTRIBUTING.md](CONTRIBUTING.md); the short version:

**Adding a new tool.** Open an issue first using the *New tool* template — mostly so two people
don't build the same thing in parallel. Then open a PR adding a single new top-level directory that
satisfies the self-contained rule above, plus a row in the Tools table. Your tool, your directory,
your call on stack and style; review is about the boundary, not your taste.

**Improving an existing tool.** Open a PR. If it's more than a small fix, check its README for the
maintainer and give them a heads-up in the issue first — they know why things are the way they are.

**Reporting a bug.** Open an issue and say which directory it's in. If the problem is with the slab
API itself rather than a tool here, the Discord is the faster path.

**Questions, ideas, and showing off what you built:**
[Discord](https://discord.gg/FWNWqrXZmg).

## License

[MIT](LICENSE). Each tool is covered by it unless that tool's directory contains a different
LICENSE file, which is allowed if a dependency forces it.
