/**
 * Resources — context a model can pull without spending a tool call.
 *
 * All three are documents the slab API already publishes as the authoritative
 * version of themselves. Exposing them here rather than restating them is the
 * same rule the slab portal follows for its docs site: never hand-copy a
 * machine-generated surface, because the copy drifts and the generated one
 * can't.
 *
 * Adding a resource: one entry in RESOURCES.
 */

import type { McpServer } from '@modelcontextprotocol/server';
import type { ToolContext } from '../context.js';

interface ResourceModule {
  name: string;
  uri: string;
  title: string;
  description: string;
  mimeType: string;
  /** Path on the slab API whose body is served verbatim. */
  path: string;
}

export const RESOURCES: ResourceModule[] = [
  {
    name: 'vocab',
    uri: 'slab://vocab',
    title: 'Accepted values',
    description:
      'Every enumerable value the slab API accepts: wire enums, sort grammars, and the live catalog ' +
      'dimensions (brands, teams, attributes, finishes, grading companies) that grow as sets are ' +
      'seeded. Read this instead of assuming a filter value.',
    mimeType: 'application/json',
    path: '/vocab',
  },
  {
    name: 'glossary',
    uri: 'slab://glossary',
    title: 'Metric definitions',
    description:
      'Plain-language definition of every metric the slab API returns, keyed by namespaced id. Use ' +
      "slab's wording when explaining a number to a user rather than composing your own.",
    mimeType: 'application/json',
    path: '/glossary',
  },
  {
    name: 'openapi',
    uri: 'slab://openapi',
    title: 'OpenAPI specification',
    description:
      'The complete, authoritative slab API contract. This server exposes a curated subset as tools; ' +
      'read this when you need to know exactly what a field means or what an endpoint returns. Large ' +
      '— fetch it deliberately, not by default.',
    mimeType: 'application/json',
    path: '/openapi.json',
  },
];

export function registerResources(server: McpServer, ctx: ToolContext): void {
  for (const resource of RESOURCES) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title,
        description: resource.description,
        mimeType: resource.mimeType,
      },
      async (uri: URL) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: resource.mimeType,
            text: await ctx.client.raw(resource.path),
          },
        ],
      }),
    );
  }
}
