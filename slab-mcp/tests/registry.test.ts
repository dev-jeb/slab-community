/**
 * Seam tests.
 *
 * These enforce the properties that prose can't self-check — the same job
 * slab's own `test_openapi.py` does for the API. Every one of them exists
 * because the failure it catches is silent: a write tool that looks read-only
 * gets no confirmation prompt from the host; a thin tool description gets
 * called at the wrong time and the user sees a wrong answer, not an error.
 *
 * Pure and offline: no network, no key, no server. `npm test`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { ALL_TOOLS, READ_TOOLS, WRITE_TOOLS } from '../src/tools/index.js';
import { PROMPTS } from '../src/prompts/index.js';
import { RESOURCES } from '../src/resources/index.js';
import { loadConfig } from '../src/config.js';
import { ApiError, ConfigError, toToolError } from '../src/errors.js';

describe('tool registry', () => {
  it('has unique, snake_case, verb-first names', () => {
    const seen = new Set<string>();
    for (const tool of ALL_TOOLS) {
      assert.ok(/^[a-z][a-z0-9_]*$/.test(tool.name), `${tool.name} is not snake_case`);
      assert.ok(!seen.has(tool.name), `duplicate tool name: ${tool.name}`);
      seen.add(tool.name);
    }
  });

  it('gives every tool a description substantial enough to route on', () => {
    // A one-line description is the single most common reason a model calls
    // the wrong tool. 200 chars is a floor, not a target.
    for (const tool of ALL_TOOLS) {
      assert.ok(tool.title.length > 0, `${tool.name} has no title`);
      assert.ok(
        tool.description.length >= 200,
        `${tool.name} description is ${tool.description.length} chars — say when to call it and what the numbers mean`,
      );
    }
  });

  it('describes every input field', () => {
    // An undescribed parameter is one the model fills in by guessing.
    for (const tool of ALL_TOOLS) {
      const schema = tool.inputSchema as unknown as z.ZodObject<Record<string, z.ZodTypeAny>>;
      const shape = schema.shape;
      assert.ok(shape, `${tool.name} inputSchema is not a z.object`);
      for (const [field, def] of Object.entries(shape)) {
        assert.ok(def.description, `${tool.name}.${field} has no .describe()`);
      }
    }
  });

  it('keeps `mutates` and `readOnlyHint` consistent', () => {
    for (const tool of ALL_TOOLS) {
      assert.equal(
        tool.annotations.readOnlyHint,
        !tool.mutates,
        `${tool.name}: mutates=${tool.mutates} contradicts readOnlyHint=${tool.annotations.readOnlyHint}`,
      );
    }
  });

  it('registers no mutating tool in the read set', () => {
    // The write gate is structural, not a naming convention. If this fails, a
    // write tool ships to every user who never opted in.
    for (const tool of READ_TOOLS) {
      assert.equal(tool.mutates, false, `${tool.name} mutates but is in READ_TOOLS`);
    }
    for (const tool of WRITE_TOOLS) {
      assert.equal(tool.mutates, true, `${tool.name} does not mutate but is in WRITE_TOOLS`);
    }
  });

  it('marks destructive tools as destructive', () => {
    for (const tool of ALL_TOOLS) {
      if (/^(remove|delete)_/.test(tool.name)) {
        assert.equal(tool.annotations.destructiveHint, true, `${tool.name} deletes but is not marked destructive`);
      }
    }
  });

  it('never enumerates live catalog values in a description', () => {
    // Served-vocab rule: brands, teams, attributes and finishes grow as sets
    // are seeded, so a list written here rots. Point at get_vocab instead.
    const banned = [/\bbrands? (are|include):/i, /valid finishes:/i, /\bteams? (are|include):/i];
    for (const tool of ALL_TOOLS) {
      for (const pattern of banned) {
        assert.ok(!pattern.test(tool.description), `${tool.name} hardcodes a live vocabulary — serve it from get_vocab`);
      }
    }
  });

  it('points metric-bearing tools at the glossary', () => {
    // Anti-drift, applied to explanations rather than values: a tool that
    // reports figures must send the agent to slab's own wording for them.
    // Without this, the agent paraphrases — and a plausible paraphrase of
    // `priced_coverage` or `portfolio_roi` is wrong in a way nothing catches.
    const metricBearing = ['get_dashboard', 'search_collection', 'get_card_pricing', 'get_community'];
    for (const name of metricBearing) {
      const tool = ALL_TOOLS.find((t) => t.name === name);
      assert.ok(tool, `${name} is missing from the registry`);
      assert.match(
        tool.description,
        /explain_metrics|glossary/,
        `${name} reports numbers but never points at explain_metrics`,
      );
    }
  });

  it('never labels snapshot drift as market movement', () => {
    // The two-lane rule. A description that says a snapshot difference is what
    // "the market did" teaches the model to say it too.
    const offenders = [/market (moved|movement) over/i, /price (rose|fell) \d+% (over|in) the (last|past)/i];
    for (const tool of ALL_TOOLS) {
      for (const pattern of offenders) {
        assert.ok(!pattern.test(tool.description), `${tool.name} describes appraisal drift as market movement`);
      }
    }
  });
});

describe('resources and prompts', () => {
  it('gives resources unique slab:// URIs and real descriptions', () => {
    const seen = new Set<string>();
    for (const resource of RESOURCES) {
      assert.ok(resource.uri.startsWith('slab://'), `${resource.name} has a non-slab URI`);
      assert.ok(!seen.has(resource.uri), `duplicate resource URI: ${resource.uri}`);
      seen.add(resource.uri);
      assert.ok(resource.description.length >= 60, `${resource.name} description is too thin`);
    }
  });

  it('renders every prompt with its optional arguments omitted', () => {
    // The path a user actually takes: the host supplies required arguments and
    // nothing else. A template that assumes an optional argument is present
    // renders the literal string "undefined" into the model's context.
    for (const prompt of PROMPTS) {
      const shape = (prompt.argsSchema as unknown as z.ZodObject<Record<string, z.ZodTypeAny>>).shape;
      const args: Record<string, string> = {};
      for (const [field, def] of Object.entries(shape)) {
        const optional = def.safeParse(undefined).success;
        assert.ok(def.description, `${prompt.name}.${field} has no .describe()`);
        if (!optional) args[field] = 'PLACEHOLDER';
      }

      const rendered = prompt.render(args);
      assert.ok(rendered.length > 50, `${prompt.name} renders empty`);
      assert.ok(!rendered.includes('undefined'), `${prompt.name} leaks "undefined" when an optional arg is omitted`);
    }
  });
});

describe('config', () => {
  it('refuses to start without an API key', () => {
    assert.throws(() => loadConfig({} as NodeJS.ProcessEnv), ConfigError);
  });

  it('defaults to read-only', () => {
    const config = loadConfig({ SLAB_API_KEY: 'sk_test' } as NodeJS.ProcessEnv);
    assert.equal(config.writesEnabled, false);
  });

  it('enables writes only on an explicit truthy value', () => {
    const on = loadConfig({ SLAB_API_KEY: 'sk_test', SLAB_MCP_WRITE: '1' } as NodeJS.ProcessEnv);
    const off = loadConfig({ SLAB_API_KEY: 'sk_test', SLAB_MCP_WRITE: '0' } as NodeJS.ProcessEnv);
    assert.equal(on.writesEnabled, true);
    assert.equal(off.writesEnabled, false);
  });

  it('strips a trailing slash from the API url', () => {
    const config = loadConfig({ SLAB_API_KEY: 'sk_test', SLAB_API_URL: 'https://example.com/' } as NodeJS.ProcessEnv);
    assert.equal(config.apiUrl, 'https://example.com');
  });
});

describe('errors', () => {
  it('turns an API error into a readable tool result, not a throw', () => {
    const result = toToolError(new ApiError(404, 'not found', 'GET', '/cards/abc/market'));
    assert.equal(result.isError, true);
    assert.match(result.content[0]!.text, /404/);
    assert.match(result.content[0]!.text, /another account/); // the actionable hint
  });

  it('never puts the API key in a tool result', () => {
    const key = 'sk_live_supersecret';
    const result = toToolError(new ApiError(401, 'unauthorized', 'GET', '/account'));
    assert.ok(!result.content[0]!.text.includes(key));
  });
});
