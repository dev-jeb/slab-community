/**
 * The server's version, read from package.json rather than restated.
 *
 * This is the version MCP clients see in the initialize handshake and show in
 * their server list. It was hardcoded here once and immediately went stale —
 * the published 0.1.2 introduced itself as 0.1.0 — which is the same
 * hand-maintained-copy failure this codebase avoids everywhere else.
 *
 * `../package.json` resolves to the package root from both `src/` (dev, via
 * tsx) and `dist/` (published), and npm always includes package.json in the
 * tarball regardless of the `files` allowlist, so it is present at runtime.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const VERSION: string = (require('../package.json') as { version: string }).version;
