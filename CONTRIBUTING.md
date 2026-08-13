# Contributing to slab community

This repo collects open-source tools built on the [slab](https://api.slab.dev-jeb.com/docs) API.
It's early and informal. Rough tools are welcome; the only thing reviewed strictly is the boundary
between tools.

## The rule everything else follows from

**One top-level directory = one self-contained tool.** See the
[README](README.md#the-one-rule-one-directory-one-self-contained-tool) for the full definition. In
review, this is what gets checked:

- [ ] Everything the tool needs lives inside its directory (deps, lockfile, config, tests, docs).
- [ ] Nothing outside the directory changed, except the Tools table in the README and, if the tool
      needs CI, a new path-filtered workflow in `.github/workflows/`.
- [ ] No imports reach into another tool's directory.
- [ ] A `README.md` in the directory says what it does, how to run it, and who maintains it.
- [ ] No secrets. No `.env`, no API key, no key in a test fixture, no key in a screenshot.

## Adding a new tool

1. **Open an issue** using the *New tool* template. This is mostly to avoid two people building the
   same thing in parallel, and to settle the directory name before you have it hardcoded in fifty
   places.
2. **Build it in one new top-level directory.** Use whatever stack you like — there's no house
   language, no shared lint config, no root build. Name the directory after the tool, in
   lowercase-with-dashes.
3. **Write the directory's README** covering: what it does, prerequisites, setup, the env vars it
   reads, and a maintainer line (`Maintained by @your-handle`).
4. **Open the PR** with the new directory plus a row in the root README's Tools table.

If your tool already exists as its own repo, say so in the issue — we can bring it in with
`git subtree` so your commit history comes along instead of landing as one squashed import.

## Improving an existing tool

Open a PR. For anything beyond a small fix, check the tool's README for its maintainer and raise an
issue first — they'll know why something is the way it is, and it saves you writing a patch that
gets rejected on context you didn't have.

If a tool has been abandoned and you want to take it over, open an issue. That's a normal thing to
ask for.

## Reporting a bug

Open an issue with the *Bug report* template and name the directory it's in. If the bug is in the
slab API itself rather than in a tool here, [Discord](https://discord.gg/FWNWqrXZmg) is faster.

## Working with the slab API

- Build against **`GET /openapi.json`** — it's the authoritative reference and always current. Don't
  hand-copy endpoint definitions into your code or docs; generate them or read them at runtime.
- Read enumerable values from **`GET /vocab`** and metric descriptions from **`GET /glossary`**
  rather than hardcoding your own copies. They grow over time; a hardcoded copy silently rots.
- **API keys stay server-side.** A key in browser-side code is exposed to anyone who opens devtools
  and carries the caller's entire account. Proxy through a backend you control.
- Get a key at [app.slab.dev-jeb.com](https://app.slab.dev-jeb.com) → Account → API Keys. Use your
  own for development; never commit one, and never ship one in a default config.

## Review and merge

PRs are reviewed by the repo owner (@dev-jeb) and, for changes inside an existing tool, ideally by
that tool's maintainer. Expect review to focus on the checklist above and on secrets — not on style.
There's no CLA and no formal process.

## Conduct

Be decent to each other. Harassment or hostility gets you removed from the repo and the Discord,
without a lot of deliberation.
