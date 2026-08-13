/**
 * Structural types for the slice of the slab wire contract this server reads.
 *
 * These are read-side conveniences for formatting, NOT a re-specification of
 * the API. `GET /openapi.json` is authoritative; anything here that disagrees
 * with it is a bug in here. Every field is optional on purpose — a response
 * that grows a field must not break formatting, and a field that moves should
 * degrade to "not shown" rather than throw.
 */

export interface SubjectOut {
  name?: string;
  team?: string | null;
}

export interface AttributeOut {
  name?: string;
}

export interface FmvSummary {
  fair_market_value?: number | null;
  grade_key?: string | null;
  sample_size?: number | null;
  price_change_30d?: number | null;
}

export interface CardOut {
  uuid: string;
  card_number?: string;
  brand?: string | null;
  set_name?: string | null;
  set_slug?: string | null;
  season?: string | null;
  year?: number | null;
  subset?: string | null;
  finish?: string | null;
  print_run?: number | null;
  subjects?: SubjectOut[];
  attributes?: AttributeOut[];
  owned_quantity?: number | null;
  market?: FmvSummary | null;
}

export interface SetOut {
  uuid: string;
  name?: string | null;
  slug?: string;
  brand?: string | null;
  season?: string | null;
  year?: number | null;
  card_count?: number | null;
  box_price?: number | null;
}

export interface Paged<T> {
  total?: number;
  limit?: number;
  offset?: number;
  items?: T[];
  facets?: Record<string, Array<{ value: string; count: number }>> | null;
  summary?: Record<string, unknown> | null;
}

export interface CardCopyOut {
  uuid: string;
  card_uuid?: string;
  quantity?: number;
  serial_number?: number | null;
  grading_company?: string | null;
  grade?: string | null;
  acquired_date?: string | null;
  cost_basis?: number | null;
  status?: string;
  storage_location?: string | null;
  market?: Record<string, unknown> | null;
  card?: CardOut | null;
}

export interface AccountOut {
  default_collector_uuid?: string | null;
  collectors?: Array<{ uuid: string; handle?: string | null }>;
}
