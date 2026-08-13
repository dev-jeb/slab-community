export interface SubjectOut {
  name: string;
  team?: string | null;
  subject_type?: string;
}

export interface AttributeOut {
  name: string;
  value?: string | null;
}

export interface FmvSummary {
  fair_market_value: string;
  grade_key: string;
  low_confidence?: boolean;
  sample_size?: number;
  as_of_date?: string | null;
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
  print_run?: number | null;
  odds?: string | null;
  release_set_slug?: string | null;
  release_set_name?: string | null;
  subjects: SubjectOut[];
  attributes: AttributeOut[];
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

export interface CollectionSearchQuery {
  q?: string | null;
  subject?: string | null;
  card_number?: string | null;
  auto?: boolean;
  rookie?: boolean;
  is_numbered?: boolean;
  graded?: boolean;
  team?: string | null;
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
  year?: number | null;
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
  format: string;
  cards_per_pack?: number | null;
  packs_per_box?: number | null;
  boxes_per_case?: number | null;
  msrp?: string | null;
  price_median?: string | null;
  sample_size?: number | null;
  low_confidence?: boolean | null;
}

export interface CardSearchResult {
  total: number;
  limit: number;
  offset: number;
  items?: CardOut[];
}

export interface CardSearchQuery {
  q?: string | null;
  subject?: string | null;
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
  uuid: string;
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
  cover_card?: CardOut | null;
  card_count: number;
  subscriber_count: number;
  is_subscribed: boolean;
}

export interface CustomSetCardOut {
  uuid: string;
  card: CardOut;
  match_mode: string;
  serial_number?: number | null;
  position: number;
  owned: boolean;
  owned_printing?: string | null;
}

export interface CustomSetDetail extends CustomSetOut {
  cards: CustomSetCardOut[];
  completion?: CompletionStats | null;
}

export interface CustomSetCreate {
  name: string;
  description?: string | null;
  visibility?: "private" | "public";
  set_type: "curated" | "dynamic";
  filter_json?: Record<string, unknown> | null;
}

export interface CustomSetCardAdd {
  card_uuid: string;
  match_mode: "any_printing" | "exact" | "exact_serial";
  serial_number?: number | null;
  position?: number;
}
