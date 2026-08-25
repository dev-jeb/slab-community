import { MissingApiKeyError } from "./errors";

const DEFAULT_API_URL = "https://api.slab.dev-jeb.com";

export function getSlabConfig() {
  const apiKey = process.env.SLAB_API_KEY;
  const apiUrl = process.env.SLAB_API_URL ?? DEFAULT_API_URL;
  const collectorUuid = process.env.SLAB_COLLECTOR_UUID;

  return { apiKey, apiUrl, collectorUuid };
}

export function requireSlabConfig(): {
  apiKey: string;
  apiUrl: string;
  collectorUuid?: string;
} {
  const config = getSlabConfig();

  if (!config.apiKey) {
    throw new MissingApiKeyError(
      "SLAB_API_KEY is not set. Mint a key at https://app.slab.dev-jeb.com and add it to .env.local",
    );
  }

  return {
    apiKey: config.apiKey,
    apiUrl: config.apiUrl,
    collectorUuid: config.collectorUuid,
  };
}
