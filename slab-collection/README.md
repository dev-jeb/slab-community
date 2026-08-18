# HockeyFrontEnd (Slab Collection)

A Next.js frontend for your [Slab](https://app.slab.dev-jeb.com) trading card collection — built to explore the Slab backend with a hockey card focus. Browse your cards, track portfolio value, research players, and drill into individual card pricing.

Your Slab API key stays on the server — the browser never sees it.

## Prerequisites

- **Node.js 20+** and **npm** ([nodejs.org](https://nodejs.org))
- A **Slab account** with an API key ([app.slab.dev-jeb.com](https://app.slab.dev-jeb.com) → Account → API Keys)
- (Optional) **Python 3** and **slab-cli** if you want to add cards from the terminal

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/dev-jeb/slab-community.git
cd slab-community/slab-collection
```

Every command below runs from `slab-collection/`, not the repo root — each tool in this repo is
self-contained and owns its own dependencies.

### 2. Configure environment variables

Copy the example env file and add your API key:

**macOS / Linux**

```bash
cp .env.example .env.local
```

**Windows (PowerShell)**

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local`:

```env
SLAB_API_KEY=sk_live_your_key_here
```

| Variable | Required | Description |
|----------|----------|-------------|
| `SLAB_API_KEY` | Yes | Your Slab API key |
| `SLAB_API_URL` | No | Defaults to `https://api.slab.dev-jeb.com` |
| `SLAB_COLLECTOR_UUID` | No | Defaults to your account's default collector |

### 3. Install dependencies

```bash
npm install
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If the API key is missing, each page shows a setup prompt with instructions.

### Production build (optional)

```bash
npm run build
npm start
```

## Populate your collection

This app reads your collection from Slab. If you have not added cards yet, use the Slab CLI:

```bash
pip install slab-cli
```

**macOS / Linux**

```bash
export SLAB_API_KEY=sk_live_...
slab collector create
slab collection add
```

**Windows (PowerShell)**

```powershell
$env:SLAB_API_KEY = "sk_live_..."
slab collector create
slab collection add
```

Refresh the site after adding cards.

## Features

### My Collection (`/`)

The dashboard: how the collection is doing and what's in it. Nothing to operate.

- Total portfolio value, cost basis, unrealized P&L, ROI, and 7-day change
- **Value history chart** (daily or weekly)
- **What's in it** — cards, sets, teams, duplicates, autos, rookies, numbered, graded vs raw;
  each count opens that slice in Search
- Most valuable cards and top sets by value

`/portfolio` redirects here; it was a second, smaller copy of the same figures.

### Search (`/search`)

One table, three scopes: **My Collection**, **Catalog**, **Sets**. All three wear the same control
band (`SearchToolbar`) — search box and button, sort and view toggle beneath, view tabs and filter
pills on the right — plus the same skeleton, empty state, and paging footer. A scope fills in only
the controls that mean something to it; the rest of the geometry lines up by construction.

**My Collection** (default) — the cards you own.

- **Cards, Sets, Teams, and Duplicates** views
- **Grid and list** layouts
- **Sort** by value, price confidence, card number, or player last name
- **Filter** by auto, rookie, or numbered
- Per-copy money on every row: market value, cost basis, unrealized P&L
- **Price confidence badges** — comp count and high / moderate / low confidence

**Catalog** — every card Slab knows about.

- **One row per card, always** — parallels are folded in, so a player search isn't the same card
  fifteen times. The row carries only what's true of the whole card (player, set, subset, number,
  how many printings exist); price, print run and odds belong to a *printing*, so they live on the
  card page, where each parallel has its own FMV, comps, and history
- **Owned** pill — rows are stamped with the copies you own, and the pill narrows to just those
- **Sets and Teams** tabs group the matching cards by product or team (facet counts), and picking
  one drills into it
- **Sort** by year, set, card number, or player

**Sets** — the products themselves, searchable by name, brand, season, year, or sport, with card
counts and pricing coverage. No card filters or grid view, because a product has neither. (Not the
same as the catalog's *Sets tab*, which groups matching cards by the product they came from.)

`/browse` and `/sets` redirect here. One-player pricing (`/players`) keeps its own page, linked from
the catalog scope.

### Sales (`/sales`)

Listings and realized gains from cards you've sold. (Was `/portfolio?tab=sales`.)

### Player Lookup (`/players`)

Search-engine style player research — find every catalog variant and compare pricing beyond a single FMV number.

- Search by player name; optional filters for card name, autos, rookies, numbered
- **Per variant:** FMV (median), comp average, purchase range, comp sales range, comp count
- **Graded pricing** table (PSA-10, BGS-9.5, etc.)
- Expandable **recent comps** (date, price, marketplace, listing title)
- **Sort** by price (high/low), best confidence, or by set — unpriced variants always sink to the bottom

### Card detail (`/cards/[uuid]`)

Click any card in your collection or player lookup results.

- Raw and graded pricing with comp ranges and averages
- **Price history chart** scaled to the card's own movement
- **Graded uplift** vs raw
- Recent comps and related **parallels**

## Architecture

- **Frontend:** Next.js App Router, React, Tailwind CSS
- **API routes:** Server-side proxy to Slab — `/api/collection`, `/api/portfolio`, `/api/player-lookup`, `/api/cards/[uuid]`, etc.
- **Auth:** `SLAB_API_KEY` in `.env.local` (never committed)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Setup required" on every page | Create `.env.local` from `.env.example` and set `SLAB_API_KEY` |
| Empty collection | Add cards via `slab collection add` or the Slab app |
| Player lookup is slow | Fetches market + comps per variant in batches; narrow with card filters |

## Maintainer

[@Tdtemplev](https://github.com/Tdtemplev). Bugs and ideas: open an issue on
[slab-community](https://github.com/dev-jeb/slab-community/issues) naming this directory, or say
hello in [Discord](https://discord.gg/FWNWqrXZmg).

## License

[MIT](../LICENSE), same as the rest of slab-community.
