/**
 * Type declarations for non-TypeScript modules.
 */

// GeoJSON files via @test-data alias
declare module '@test-data/local-store/catalog.json' {
  const value: {
    type: string;
    id: string;
    stac_version: string;
    description: string;
    title: string;
    links: Array<{
      rel: string;
      href: string;
      type?: string;
      title?: string;
    }>;
  };
  export default value;
}

declare module '@test-data/local-store/exercise-alpha/item.json' {
  const value: unknown;
  export default value;
}

declare module '@test-data/local-store/exercise-alpha/exercise-alpha.geojson' {
  import type { FeatureCollection } from 'geojson';
  const value: FeatureCollection;
  export default value;
}

declare module '@test-data/local-store/training-run-1/item.json' {
  const value: unknown;
  export default value;
}

declare module '@test-data/local-store/training-run-1/training-run-1.geojson' {
  import type { FeatureCollection } from 'geojson';
  const value: FeatureCollection;
  export default value;
}
