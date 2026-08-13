const NHL_LOGO_BASE = "https://assets.nhle.com/logos/nhl/svg";

/** Slab team names → NHL tri-code (light SVG works on dark backgrounds). */
const TEAM_CODES: Record<string, string> = {
  "anaheim ducks": "ANA",
  ducks: "ANA",
  "arizona coyotes": "ARI",
  coyotes: "ARI",
  "utah hockey club": "UTA",
  utah: "UTA",
  "boston bruins": "BOS",
  bruins: "BOS",
  "buffalo sabres": "BUF",
  sabres: "BUF",
  "calgary flames": "CGY",
  flames: "CGY",
  "carolina hurricanes": "CAR",
  hurricanes: "CAR",
  "chicago blackhawks": "CHI",
  blackhawks: "CHI",
  "colorado avalanche": "COL",
  avalanche: "COL",
  "columbus blue jackets": "CBJ",
  "blue jackets": "CBJ",
  "dallas stars": "DAL",
  stars: "DAL",
  "detroit red wings": "DET",
  "red wings": "DET",
  "edmonton oilers": "EDM",
  oilers: "EDM",
  "florida panthers": "FLA",
  panthers: "FLA",
  "los angeles kings": "LAK",
  kings: "LAK",
  "minnesota wild": "MIN",
  wild: "MIN",
  "montreal canadiens": "MTL",
  canadiens: "MTL",
  "nashville predators": "NSH",
  predators: "NSH",
  "new jersey devils": "NJD",
  devils: "NJD",
  "new york islanders": "NYI",
  islanders: "NYI",
  "new york rangers": "NYR",
  rangers: "NYR",
  "ottawa senators": "OTT",
  senators: "OTT",
  "philadelphia flyers": "PHI",
  flyers: "PHI",
  "pittsburgh penguins": "PIT",
  penguins: "PIT",
  "san jose sharks": "SJS",
  sharks: "SJS",
  "seattle kraken": "SEA",
  kraken: "SEA",
  "st. louis blues": "STL",
  "st louis blues": "STL",
  blues: "STL",
  "tampa bay lightning": "TBL",
  lightning: "TBL",
  "toronto maple leafs": "TOR",
  "maple leafs": "TOR",
  "vancouver canucks": "VAN",
  canucks: "VAN",
  "vegas golden knights": "VGK",
  "golden knights": "VGK",
  "washington capitals": "WSH",
  capitals: "WSH",
  "winnipeg jets": "WPG",
  jets: "WPG",
};

function normalizeTeamName(teamName: string): string {
  return teamName.toLowerCase().replace(/\./g, "").trim();
}

export function resolveTeamCode(teamName: string): string | null {
  const normalized = normalizeTeamName(teamName);
  if (TEAM_CODES[normalized]) return TEAM_CODES[normalized];

  const nickname = normalized.split(/\s+/).at(-1);
  if (nickname && TEAM_CODES[nickname]) return TEAM_CODES[nickname];

  const lastTwo = normalized.split(/\s+/).slice(-2).join(" ");
  if (TEAM_CODES[lastTwo]) return TEAM_CODES[lastTwo];

  return null;
}

export function teamLogoUrl(teamName: string): string | null {
  const code = resolveTeamCode(teamName);
  if (!code) return null;
  return `${NHL_LOGO_BASE}/${code}_light.svg`;
}

export function teamInitials(teamName: string): string {
  return teamName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
