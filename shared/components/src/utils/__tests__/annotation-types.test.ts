import { describe, it, expect } from 'vitest';
import { isAnnotationFeature } from '@debrief/schemas';
import type { SchemaAnnotationFeature, DebriefFeature } from '@debrief/schemas';

import circleFixture from '../../../../schemas/src/fixtures/valid/circle-annotation-valid-01.json';
import rectangleFixture from '../../../../schemas/src/fixtures/valid/rectangle-annotation-valid-01.json';
import lineFixture from '../../../../schemas/src/fixtures/valid/line-annotation-valid-01.json';
import textFixture from '../../../../schemas/src/fixtures/valid/text-annotation-valid-01.json';
import vectorFixture from '../../../../schemas/src/fixtures/valid/vector-annotation-valid-01.json';
import narrativeFixture from '../../../../schemas/src/fixtures/valid/narrative-entry-valid-01.json';
import polyFixture from '../../../../schemas/src/fixtures/valid/poly-annotation-valid-01.json';

const ANNOTATION_KINDS = ['NARRATIVE', 'CIRCLE', 'RECTANGLE', 'LINE', 'TEXT', 'VECTOR', 'POLY'] as const;

const fixtures: Record<string, unknown> = {
  CIRCLE: circleFixture,
  RECTANGLE: rectangleFixture,
  LINE: lineFixture,
  TEXT: textFixture,
  VECTOR: vectorFixture,
  NARRATIVE: narrativeFixture,
  POLY: polyFixture,
};

describe('SchemaAnnotationFeature', () => {
  it.each(ANNOTATION_KINDS)('fixture for %s matches SchemaAnnotationFeature shape', (kind) => {
    const fixture = fixtures[kind] as SchemaAnnotationFeature;
    expect(fixture).toBeDefined();
    expect(fixture.type).toBe('Feature');
    expect(fixture.properties.kind).toBe(kind);
  });

  it.each(ANNOTATION_KINDS)('isAnnotationFeature returns true for %s', (kind) => {
    const fixture = fixtures[kind] as DebriefFeature;
    expect(isAnnotationFeature(fixture)).toBe(true);
  });

  it('covers all 7 annotation types', () => {
    expect(ANNOTATION_KINDS).toHaveLength(7);
    expect(Object.keys(fixtures)).toHaveLength(7);
  });
});
