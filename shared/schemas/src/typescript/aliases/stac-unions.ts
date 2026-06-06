/**
 * TS-only discriminated-union alias for the STAC catalog cluster (#223).
 *
 * Per Research R-001 and data-model.md §"TS-only aliases": LinkML expresses
 * the STAC root-object discriminator as **sibling classes** (StacCatalog
 * and StacCollection each carry a `type: "Catalog"` / `type: "Collection"`
 * literal via the `equals_string` constraint on the StacTypeEnum slot).
 * The union of those siblings is expressed in TypeScript via this
 * re-export; LinkML does not emit unions of named classes natively.
 *
 * Per the audit's R4 file-level rule, any file that imports from
 * `@debrief/schemas` is reclassified as schema-rooted, so the alias
 * below is NOT a hand-typed declaration from the audit's perspective.
 *
 * Use site: `apps/vscode/src/services/stacService.ts` and
 * `apps/vscode/src/panels/catalogOverviewPanel.ts` read the catalog
 * root JSON and narrow via `if (x.type === 'Collection')` to access
 * Collection-only fields (`license`, `extent`, `summaries`).
 */

import type {
  StacCatalog,
  StacCollection,
} from '../../generated/typescript/types.js';

/**
 * Discriminated union over the STAC catalog root types. Narrowable
 * by the `type` field — TypeScript control-flow analysis picks the
 * concrete class when the discriminator is checked.
 */
export type StacCatalogOrCollection = StacCatalog | StacCollection;
