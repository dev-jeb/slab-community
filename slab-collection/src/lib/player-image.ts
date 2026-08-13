const NHL_SEARCH = "https://search.d3.nhle.com/api/v1/search/player";
const WIKI_API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "SlabCollection/1.0 (hockey card collector app)";

interface NhlSearchHit {
  playerId?: number;
  name?: string;
}

async function fetchNhlPlayerImageUrl(
  playerName: string,
): Promise<string | null> {
  const url = `${NHL_SEARCH}?culture=en-us&limit=5&q=${encodeURIComponent(playerName)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) return null;

  const hits = (await response.json()) as NhlSearchHit[];
  if (!Array.isArray(hits) || hits.length === 0) return null;

  const parts = playerName.toLowerCase().split(/\s+/).filter(Boolean);
  const last = parts.at(-1);

  const match =
    hits.find((hit) => hit.name?.toLowerCase().includes(playerName.toLowerCase())) ??
    hits.find((hit) => last && hit.name?.toLowerCase().includes(last)) ??
    hits[0];

  if (!match?.playerId) return null;
  return `https://assets.nhle.com/mugs/nhl/latest/${match.playerId}.png`;
}

async function fetchWikipediaImageUrl(
  playerName: string,
): Promise<string | null> {
  const title = playerName.replaceAll(" ", "_");
  const params = new URLSearchParams({
    action: "query",
    titles: title,
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "320",
    format: "json",
  });

  const response = await fetch(`${WIKI_API}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    query?: {
      pages?: Record<string, { thumbnail?: { source?: string } }>;
    };
  };

  const pages = Object.values(data.query?.pages ?? {});
  return pages.find((page) => page.thumbnail?.source)?.thumbnail?.source ?? null;
}

export async function fetchPlayerImageUrl(
  playerName: string,
): Promise<string | null> {
  const nhl = await fetchNhlPlayerImageUrl(playerName);
  if (nhl) return nhl;
  return fetchWikipediaImageUrl(playerName);
}
