/**
 * Where the API key comes from.
 *
 * The obvious option — pasting the key into the MCP client's config as an env
 * value — has a problem specific to agents, and it is not the usual
 * plaintext-at-rest one. `~/.claude.json` is already 0600, so the OS is not the
 * weak point. The weak point is that **the agent can read its own config**. Ask
 * Claude Code to debug a flaky MCP server and a perfectly reasonable next step
 * is to cat that file — at which point a live credential is sitting in a
 * transcript, in scrollback, and in whatever that conversation gets pasted
 * into. Nothing has been breached; the key just leaked sideways through normal
 * use.
 *
 * So this resolves a key from one of two places:
 *
 *   SLAB_API_KEY          the literal key. Simple, and the right answer for CI,
 *                         containers, and anywhere a secret manager is absent.
 *   SLAB_API_KEY_COMMAND  a command whose stdout is the key. The config then
 *                         holds an instruction, not a credential.
 *
 * The command form deliberately knows nothing about any particular vault. One
 * seam covers macOS Keychain, 1Password, pass, Vault, or a script someone
 * writes tomorrow — the same shape as the seeder's `sources/` and the CLI's
 * `platforms/`: name the capability, let each backend implement it, and depend
 * on none of them.
 */

import { execSync } from 'node:child_process';
import { ConfigError } from './errors.js';

export type KeySource = 'SLAB_API_KEY' | 'SLAB_API_KEY_COMMAND';

export interface ResolvedKey {
  key: string;
  /** Which mechanism supplied it. Logged at startup so a wrong key is diagnosable. */
  source: KeySource;
}

/** How long a credential command may take before we give up on it. */
const COMMAND_TIMEOUT_MS = 10_000;

const SETUP_HELP =
  'Set one of:\n' +
  '  SLAB_API_KEY          — the key itself\n' +
  '  SLAB_API_KEY_COMMAND  — a command that prints the key, e.g.\n' +
  '                          security find-generic-password -s slab-mcp -w   (macOS Keychain)\n' +
  '                          op read "op://Private/slab/credential"          (1Password)\n' +
  '                          pass show slab/api-key                          (pass)\n' +
  'Get a key at https://app.slab.dev-jeb.com -> Account -> API Keys.';

export function resolveApiKey(env: NodeJS.ProcessEnv = process.env): ResolvedKey {
  const literal = env.SLAB_API_KEY?.trim();
  const command = env.SLAB_API_KEY_COMMAND?.trim();

  // The literal wins when both are set. Explicit beats indirect, matching how
  // git and docker resolve credentials — and the startup log names the source,
  // so a forgotten shell export shadowing a vault is visible rather than a
  // mystery 401.
  if (literal) return { key: literal, source: 'SLAB_API_KEY' };

  if (command) {
    let output: string;
    try {
      output = execSync(command, {
        encoding: 'utf8',
        timeout: COMMAND_TIMEOUT_MS,
        // stdin from /dev/null: a credential helper that tries to prompt should
        // fail fast rather than hang forever holding up the handshake. stderr
        // is passed through to our stderr so "keychain item not found" is
        // visible to the user in the client's server log.
        stdio: ['ignore', 'pipe', 'inherit'],
      });
    } catch (err) {
      // Deliberately does NOT include the command's stdout — on a partial
      // failure that could be the secret itself.
      const reason = err instanceof Error ? err.message : String(err);
      throw new ConfigError(
        `SLAB_API_KEY_COMMAND failed: ${reason}\n` +
          `Command was: ${command}\n` +
          'Run it yourself in a terminal — it must print the key to stdout and exit 0.',
      );
    }

    const key = output.trim();
    if (!key) {
      throw new ConfigError(
        `SLAB_API_KEY_COMMAND produced no output.\nCommand was: ${command}\n` +
          'It must print the key to stdout.',
      );
    }
    return { key, source: 'SLAB_API_KEY_COMMAND' };
  }

  throw new ConfigError(`No slab API key configured.\n\n${SETUP_HELP}`);
}
