export interface SubjectOut {
  uuid?: string | null;
  name: string;
  team?: string | null;
  subject_type?: string;
}

export interface AttributeOut {
  name: string;
  value?: string | null;
}

/**
 * Liquidity — how often one price key (card, finish, grade) actually sells.
 *
 * Descriptive, never prescriptive: the label states the observed pace; whether that pace makes
 * something worth buying, selling, or holding is the reader's call. Render metric meaning from
 * the response's `liquidity.*` glossary entries, not from captions written here.
 */
export type LiquidityLabel =
  | "sells_daily"
  | "sells_weekly"
  | "sells_monthly"
  | "sells_every_few_months"
  | "sells_rarely"
  | "no_recent_sales"
  | "too_new_to_say";

export interface Liquidity {
  /** Real sales in the trailing 90 days — same window and comps as the FMV. */
  sales_90d: number;
  sales_365d: number;
  /** Median gap between sales in the 90-day window; null when fewer than 3 sales landed there. */
  median_days_between_sales?: number | null;
  /** How long slab has been observing sales of this key, in days, capped at 365. */
  observed_days: number;
  label: LiquidityLabel;
}

export interface FmvSummary {
  fair_market_value: string;
  grade_key: string;
  low_confidence?: boolean;
  sample_size?: number;
  as_of_date?: string | null;
  /** Populated on per-card views (market, grading desk); null on bulk search rows. */
  liquidity?: Liquidity | null;
}

export interface CardOut {
  uuid: string;
  card_number: string;
  brand?: string | null;
  set_name?: string | null;
  set_slug?: string | null;
  season?: string | null;
  year?: number | null;
  subset?: string | null;
  finish?: string | null;
  /** Parent (base) card UUID; null for base cards. */
  parent_card_uuid?: string | null;
  print_run?: number | null;
  odds?: string | null;
  release_set_slug?: string | null;
  release_set_name?: string | null;
  subjects: SubjectOut[];
  attributes: AttributeOut[];
  /** Copies the queried collector owns. Only set when the search passed a `collector`. */
  owned_quantity?: number | null;
  /** Printings in this card's slot, base included. Only set under `collapse_parallels`. */
  printing_count?: number | null;
  market?: FmvSummary | null;
}

export interface MarketValue {
  fair_market_value?: string | null;
  price_low?: string | null;
  price_high?: string | null;
  sample_size?: number | null;
  low_confidence?: boolean | null;
  unrealized_gain_loss?: string | null;
  roi?: string | null;
}

export interface CardCopyOut {
  uuid: string;
  collector_uuid: string;
  card_uuid: string;
  quantity: number;
  serial_number?: number | null;
  grading_company?: string | null;
  grade?: string | null;
  acquisition_cost?: string | null;
  cost_basis?: string | null;
  status: string;
  notes?: string | null;
  sale_price?: string | null;
  sold_date?: string | null;
  realized_gain_loss?: string | null;
  market?: MarketValue | null;
  card?: CardOut | null;
}

export type CopyStatus =
  | "in_collection"
  | "for_trade"
  | "for_sale"
  | "sold";

export interface CardCopyUpdate {
  status?: CopyStatus | null;
  sale_price?: string | number | null;
  sold_date?: string | null;
  notes?: string | null;
}

export interface PortfolioSummary {
  total_cost_basis?: string | null;
  portfolio_value?: string | null;
  total_unrealized_gain_loss?: string | null;
  portfolio_roi?: string | null;
  priced_copies?: number;
  unpriced_copies?: number;
}

export interface CollectionResult {
  total: number;
  limit: number;
  offset: number;
  items?: CardCopyOut[];
  summary?: PortfolioSummary | null;
}

// --- Grouped views -------------------------------------------------------
// The API rolls the collection up by set, by card, or by team and pages the GROUPS. `total` is the
// number of groups, not copies, and `total_value` is null when nothing in a group is priced —
// unpriced is unknown, not zero, so render it as "—" rather than "$0".

/** Group ordering. Prefix with `-` for descending; the API defaults to `-value`. */
export type GroupSort = "value" | "-value" | "copies" | "-copies" | "name" | "-name";

export interface SetGroupOut {
  set_uuid: string;
  /** Pass back as `set_slug` to collection search to page this group's copies. */
  set_slug: string;
  name: string;
  brand?: string | null;
  season?: string | null;
  year?: number | null;
  copy_count: number;
  card_count: number;
  total_value?: string | null;
  copies?: CardCopyOut[];
}

export interface DuplicateGroupOut {
  card: CardOut;
  copy_count: number;
  total_value?: string | null;
  copies?: CardCopyOut[];
}

/**
 * Cards you own in more than one printing of the same slot (base + Outburst, two finishes, …).
 * There is no grouped API for this — the collection page builds it from copies.
 */
export interface ParallelGroupOut {
  family_key: string;
  card: CardOut;
  printing_count: number;
  copy_count: number;
  total_value?: string | null;
  copies?: CardCopyOut[];
}

export interface TeamGroupOut {
  name: string;
  copy_count: number;
  player_count: number;
  total_value?: string | null;
  copies?: CardCopyOut[];
}

export interface GroupResult<T> {
  /** Number of GROUPS, not copies. */
  total: number;
  limit: number;
  offset: number;
  items?: T[];
}

export interface CollectionSearchQuery {
  q?: string | null;
  subject?: string | null;
  card_number?: string | null;
  auto?: boolean;
  rookie?: boolean;
  is_numbered?: boolean;
  graded?: boolean;
  team?: string | null;
  /** Set membership. The API takes a list; a bare string is accepted as a one-item CSV. */
  set_slug?: string | string[] | null;
  limit?: number;
  offset?: number;
  status?: string[] | null;
  sort?: string | null;
  serial?: number | null;
}

export interface SetOut {
  uuid: string;
  slug: string;
  name?: string | null;
  brand?: string | null;
  season?: string | null;
  /** The SEASON, not the release year: 2025 for a 2025-26 product. */
  year?: number | null;
  /** ISO date the product hit shelves. Null until the set's overview has been ingested. */
  release_date?: string | null;
  sport?: string | null;
  card_count?: number | null;
  priced_count?: number | null;
  sales_90d?: number | null;
  box_price?: string | null;
}

export interface SetSearchResult {
  total: number;
  limit: number;
  offset: number;
  items?: SetOut[];
}

export interface SetSearchQuery {
  q?: string | null;
  brand?: string[] | null;
  year?: number | null;
  sport?: string | null;
  limit?: number;
  offset?: number;
}

export interface SealedProductOut {
  uuid: string;
  set_uuid: string;
  set_name?: string | null;
  /** hobby_box | hobby_case | blaster_box | … — a `SealedFormat` on the wire. */
  format: string;
  cards_per_pack?: number | null;
  packs_per_box?: number | null;
  boxes_per_case?: number | null;
  msrp?: string | null;
  price_median?: string | null;
  as_of_date?: string | null;
  sample_size?: number | null;
  low_confidence?: boolean | null;
}

/** One day of a sealed SKU's price series — same shape as a card's, keyed by product. */
export interface SealedPricePoint {
  date: string;
  price_median: string;
  price_low?: string | null;
  price_high?: string | null;
  sample_size?: number;
  low_confidence?: boolean;
}

export interface SealedPriceHistory {
  product_uuid: string;
  set_name?: string | null;
  format: string;
  start_date: string;
  end_date: string;
  interval: string;
  points: SealedPricePoint[];
}

/**
 * A sealed SKU's market: its snapshot price points and the sales behind them.
 *
 * Sealed has no grade or finish axis — v1 prices factory-sealed only — so a comp here carries a
 * date, a price, a marketplace and its listing title, and nothing about condition.
 */
export interface SealedMarket {
  product: SealedProductOut;
  as_of_date?: string | null;
  price_points: PricePointOut[];
  total_comps: number;
  comps: CompOut[];
}

/** A set's most expensive printings by headline FMV. */
export interface TopCardOut {
  card_uuid: string;
  card_number: string;
  subjects: string[];
  subset?: string | null;
  finish?: string | null;
  print_run?: number | null;
  /** Headline FMV for the printing — the same `FmvSummary` a card search returns. */
  market?: FmvSummary | null;
}

export interface SetTopCards {
  set_uuid: string;
  set_name?: string | null;
  season?: string | null;
  total_priced?: number | null;
  cards: TopCardOut[];
}

/** A value and how many results carry it, within the current filter set. */
export interface FacetCount {
  value: string;
  count: number;
}

/** Only the dimensions a search asked for are populated. */
export interface Facets {
  brand?: FacetCount[] | null;
  year?: FacetCount[] | null;
  set?: FacetCount[] | null;
  subset?: FacetCount[] | null;
  finish?: FacetCount[] | null;
  team?: FacetCount[] | null;
  attribute?: FacetCount[] | null;
}

export interface CardSearchResult {
  total: number;
  limit: number;
  offset: number;
  items?: CardOut[];
  facets?: Facets | null;
}

export interface CardSearchQuery {
  q?: string | null;
  subject?: string | null;
  /** Exact card number (e.g. YG-201). With `set_slug`, this is one card slot. */
  card_number?: string | null;
  set_slug?: string[] | null;
  release?: string[] | null;
  team?: string[] | null;
  year?: number | null;
  brand?: string[] | null;
  finish?: string[] | null;
  attribute?: string[] | null;
  base_only?: boolean;
  numbered_max?: number;
  include_market?: boolean;
  auto?: boolean;
  rookie?: boolean;
  relic?: boolean;
  is_numbered?: boolean;
  subset?: string[];
  /** Collector UUID — annotates each row with `owned_quantity`. Filled in server-side. */
  collector?: string | null;
  /** With `collector`: true = only cards you own, false = only ones you don't. */
  owned?: boolean | null;
  /** Comma-separated facet dimensions to count: brand, year, set, subset, finish, team, attribute. */
  facets?: string | null;
  /** One row per card SLOT instead of one per printing; the row carries `printing_count`. */
  collapse_parallels?: boolean;
  /** Sort key, `-` prefix for descending: year, card_number, numbered, subject, brand, set. */
  sort?: string | null;
  limit?: number;
  offset?: number;
}

export interface PricePointOut {
  grade_key: string;
  finish?: string | null;
  as_of_date?: string | null;
  window_days?: number;
  sample_size: number;
  price_median: string;
  price_low?: string | null;
  price_high?: string | null;
  low_confidence?: boolean;
  method?: string;
  currency?: string;
  /** How often this exact price key actually sells — see the `liquidity.*` glossary. */
  liquidity?: Liquidity | null;
}

export interface CardMarket {
  card_uuid: string;
  card_number: string;
  subjects: string[];
  set_name?: string | null;
  subset?: string | null;
  finish?: string | null;
  as_of_date?: string | null;
  price_points: PricePointOut[];
  /** Meaning of the liquidity metrics on each price point (`liquidity.*` entries) — render THIS
   *  text, don't caption the numbers here. Absent from API builds before liquidity landed. */
  glossary?: Record<string, MetricInfo>;
}

export interface CompOut {
  sold_date?: string | null;
  sale_price?: string | null;
  currency?: string;
  grade_key?: string | null;
  grade?: string | null;
  finish?: string | null;
  marketplace: string;
  sale_type?: string | null;
  title: string;
  match_status: string;
  /** "RAW" only means the title named no grade. True = this sale priced like the card's GRADED
   *  copies, so treat the grade as unconfirmed — don't read its price as raw value. */
  grade_unconfirmed?: boolean;
}

export interface CardComps {
  card_uuid: string;
  card_number: string;
  subjects: string[];
  set_name?: string | null;
  subset?: string | null;
  finish?: string | null;
  total: number;
  comps: CompOut[];
}

/**
 * Grading Desk — the grading math for a raw card (GET /cards/{uuid}/grading-desk).
 *
 * The API computes a BAR, never a probability, and describes, never prescribes:
 * `ten_confidence_needed` is how likely a gem would have to be for grading and staying raw to pay
 * the same, and `break_even` names which side of that line the observed prices land on — data for
 * the holder's decision, not a recommendation. Render the meaning of every metric from the
 * response's `glossary` (the `grading.*` entries) rather than writing captions here — one source
 * of truth, same words as the CLI and the API docs.
 */
export type BreakEvenRegion =
  | "pays_at_any_grade"
  | "depends_on_grade"
  | "pays_at_no_grade"
  | "not_enough_data";

export interface MetricInfo {
  label: string;
  summary: string;
  detail: string;
}

export interface GradeLanePayoff {
  grade_key: string;
  fair_market_value: string;
  /** fmv − raw − fee; null when the card has no raw price. */
  payoff?: string | null;
  sample_size: number;
  low_confidence?: boolean;
  as_of_date?: string | null;
  /** How often this lane actually sells — a payoff at a grade that trades twice a year is a
   *  different wait than one that trades weekly. Null until the API populates lanes. */
  liquidity?: Liquidity | null;
}

export interface GradingDesk {
  card_uuid: string;
  card_number?: string | null;
  subjects: string[];
  set_name?: string | null;
  subset?: string | null;
  finish?: string | null;
  raw?: FmvSummary | null;
  grading_company: string;
  fee: string;
  fee_source: "default" | "override";
  lanes: GradeLanePayoff[];
  ten_confidence_needed?: number | null;
  ten_confidence_needed_bad_day?: number | null;
  miss_grade?: string | null;
  bad_day_grade?: string | null;
  break_even: BreakEvenRegion;
  thin_data?: boolean;
  glossary: Record<string, MetricInfo>;
}

export interface GradingDeskEntry {
  copy_uuid: string;
  quantity: number;
  desk: GradingDesk;
}

export interface CollectionGradingDesk {
  collector_uuid: string;
  total_raw_copies: number;
  deskable: number;
  entries: GradingDeskEntry[];
  fee_note: string;
  glossary: Record<string, MetricInfo>;
}

export interface CollectorOut {
  uuid: string;
  name: string;
  is_default?: boolean;
}

export interface MeOut {
  account: { uuid: string; email?: string | null };
  collectors: CollectorOut[];
  default_collector_uuid?: string | null;
}

export interface SlabError {
  detail: string;
}

export interface HighlightCard {
  /** The COPY's uuid — this row is a physical copy you own, not the catalog card. */
  uuid: string;
  /** The catalog card behind the copy — what /cards/{uuid} takes. Absent from older API builds. */
  card_uuid?: string | null;
  card_number: string;
  subjects: string[];
  set_name?: string | null;
  subset?: string | null;
  finish?: string | null;
  print_run?: number | null;
  grade_key?: string | null;
  cost_basis?: string | null;
  fair_market_value?: string | null;
  unrealized_gain_loss?: string | null;
}

export interface LabeledCount {
  label: string;
  count: number;
}

export interface PortfolioPoint {
  date: string;
  portfolio_value: string;
  cost_basis?: string | null;
  priced_copies?: number;
  total_copies?: number;
}

export interface DashboardStats {
  collector: string;
  total_cards?: number;
  total_cost_basis?: string | null;
  portfolio_value?: string | null;
  total_unrealized_gain_loss?: string | null;
  portfolio_roi?: string | null;
  priced_coverage?: string | null;
  portfolio_change_7d?: string | null;
  portfolio_series?: PortfolioPoint[];
  most_valuable?: HighlightCard[];
  top_sets?: LabeledCount[];
  autos?: number;
  rookies?: number;
  numbered?: number;
  teams?: number;
  /** Distinct sets represented in the collection. */
  sets?: number;
  /** Cards owned more than once, counted per card (quantity counts). */
  duplicates?: number;
  /** Copies whose catalog card is a parallel (has a parent / finish). */
  parallel_count?: number;
  /** Copies whose catalog card is a base card. */
  base_count?: number;
  graded_count?: number;
  raw_count?: number;
}

export interface PortfolioHistory {
  collector_uuid: string;
  start_date: string;
  end_date: string;
  points: PortfolioPoint[];
}

export interface CardPricePoint {
  date: string;
  price_median: string;
  price_low?: string | null;
  price_high?: string | null;
  sample_size?: number;
  low_confidence?: boolean;
}

export interface CardPriceHistory {
  card_uuid: string;
  card_number: string;
  subjects: string[];
  set_name?: string | null;
  grade_key: string;
  finish?: string | null;
  start_date: string;
  end_date: string;
  interval: string;
  points: CardPricePoint[];
}

export interface CatalogStats {
  total_sets?: number | null;
  total_cards?: number | null;
  priced_cards?: number | null;
  sales_90d?: number | null;
}

export interface TickerItem {
  kind: string;
  icon: string;
  text: string;
}

export interface CommunityBoard {
  stats?: CatalogStats | null;
  /** @deprecated Slab wire field is `stats`; kept for older payloads */
  catalog?: CatalogStats | null;
  ticker?: TickerItem[];
  popular_sets?: CustomSetOut[];
}

export interface CustomSetSearchQuery {
  q?: string;
  creator_uuid?: string;
  collector_uuid?: string;
  visibility?: "private" | "public";
  set_type?: "curated" | "dynamic";
  subscribed_only?: boolean;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface CustomSetSearchResult {
  total: number;
  limit: number;
  offset: number;
  items: CustomSetOut[];
}

export interface CompletionStats {
  total_cards: number;
  owned_cards: number;
  completion_pct: number;
}

export interface CustomSetOut {
  uuid: string;
  creator_uuid: string;
  creator_name?: string | null;
  name: string;
  description?: string | null;
  visibility: string;
  set_type: string;
  /** Dynamic sets only — set-wide match granularity; null for curated. */
  dynamic_match?: string | null;
  cover_card?: CardOut | null;
  card_count: number;
  subscriber_count: number;
  is_subscribed: boolean;
}

export interface CustomSetCardOut {
  uuid: string;
  /** The chased card — null for player slots (match_mode "any_card"). */
  card?: CardOut | null;
  /** The chased player's name — set only for player slots. */
  subject?: string | null;
  subject_uuid?: string | null;
  match_mode: string;
  serial_number?: number | null;
  /** any_card qualifiers — narrow which card of the player counts. */
  subject_year?: number | null;
  subject_team?: string | null;
  subject_attribute?: string | null;
  position: number;
  owned: boolean;
  /** For player slots this names the exact owned card that filled the slot. */
  owned_printing?: string | null;
}

export interface CustomSetDetail extends CustomSetOut {
  cards: CustomSetCardOut[];
  completion?: CompletionStats | null;
  /** The cards list is one page; completion always covers the whole set. */
  limit?: number;
  offset?: number;
}

export interface CustomSetCreate {
  name: string;
  description?: string | null;
  visibility?: "private" | "public";
  set_type: "curated" | "dynamic";
  filter_json?: Record<string, unknown> | null;
  /** Dynamic sets: set-wide granularity (any_printing | exact | any_card). */
  dynamic_match?: "any_printing" | "exact" | "any_card";
}

export interface CustomSetCardAdd {
  /** Card modes take card_uuid; any_card player slots take subject_uuid instead. */
  card_uuid?: string;
  subject_uuid?: string;
  match_mode: "any_printing" | "exact" | "exact_serial" | "any_card";
  serial_number?: number | null;
  subject_year?: number | null;
  subject_team?: string | null;
  subject_attribute?: string | null;
  position?: number;
}

/* --- Market analytics -------------------------------------------------------
   Catalog-level benchmarks derived from real sales. Descriptive, never prescriptive: the API
   hands over the measured shape of the market plus the evidence counts behind every number, and
   says nothing about what to buy, sell, rip, or grade. `GET /market/lifecycle` is the first. */

/** One age-month of the lifecycle benchmark. */
export interface LifecyclePoint {
  /** Whole months since the card's set released; 0 = release day. */
  age_months: number;
  /** Index level at this age; 100 = release-day price by construction. */
  level: number;
  /** Percent the typical card moves in this month of life (0 at age 0). */
  monthly_move: number;
  /** Same-card month-over-month comparisons behind this age — the evidence count. */
  pairs: number;
}

/**
 * The average price path a raw card follows as it ages.
 *
 * `points` covers ONLY the estimated region (age 0 through `estimated_through_month`); past that
 * the benchmark holds flat at `clamp_level` and the API deliberately ships no points, because the
 * data out there can't tell flat from noise. Don't invent them on the client either.
 */
/** What a lifecycle curve is a benchmark OF. Each runs the same recipe over a different pool. */
export type LifecycleUniverse = "raw_cards" | "hobby_boxes";

export interface LifecycleCurve {
  /** This build's identity — quote it and the numbers are reproducible. */
  uuid: string;
  /** Which pool this curve benchmarks. Absent on API builds before the sealed universe landed. */
  universe?: LifecycleUniverse;
  /** When this build ran; the curve is frozen until the next one. */
  computed_dt: string;
  data_from: string;
  data_through: string;
  comp_count: number;
  estimated_through_month: number;
  clamp_level: number;
  min_bin_pairs: number;
  max_bin_months: number;
  method: string;
  points: LifecyclePoint[];
  /** The `market.*` glossary — render THIS text rather than writing our own definitions. */
  glossary?: Record<string, MetricInfo>;
}
