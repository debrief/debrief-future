# Idea: Create LinkML schemas for REP annotation item types

**ID**: 015
**Category**: Infrastructure
**Date**: 2026-01-16
**Status**: approved

## Problem

Item 007 in the backlog ("Implement REP file special comments - NARRATIVE, CIRCLE, etc.") cannot be implemented without first defining schemas for these annotation types. The project follows a schema-first approach (CONSTITUTION Article II), meaning we need LinkML master schemas before any parsing or storage code can be written.

Currently, there are no schemas defining how to represent annotations like circles, ellipses, rectangles, lines, polygons, or narrative text in the Debrief data model.

## Proposed Solution

Create LinkML schemas for all REP annotation item types as standalone schema classes:

### Annotation Types to Define

- **NARRATIVE** - Text annotations with position and styling
- **CIRCLE** - Circular regions with center and radius
- **ELLIPSE** - Elliptical regions with center and axes
- **RECTANGLE** - Rectangular regions with bounds
- **LINE** - Line segments between points
- **POLYGON** - Arbitrary closed shapes

### Schema Design

- **Standalone item types** - Each annotation is an independent schema class
- **Reference positions by coordinates** - No tight coupling to track schemas
- **Common properties** - Each type should include: id, time/timespan, label, color/styling, provenance

### Deliverables

1. LinkML master schemas in `/shared/schemas/`
2. Generated Pydantic models (Python)
3. Generated JSON Schema
4. Generated TypeScript interfaces
5. Golden fixtures (valid/invalid JSON examples)
6. Round-trip tests (Python <-> JSON <-> TypeScript)

## Success Criteria

- [ ] LinkML schemas pass validation
- [ ] Pydantic models generated and importable
- [ ] JSON Schema generated and validates fixtures
- [ ] TypeScript interfaces generated
- [ ] Golden fixtures exist for each annotation type (valid and invalid examples)
- [ ] Round-trip tests pass: Python -> JSON -> TypeScript -> JSON -> Python produces identical data
- [ ] Schema comparison tests pass: Pydantic-generated JSON Schema matches LinkML-generated

## Constraints

- Must follow CONSTITUTION Article II (Schema Integrity)
- Must work offline (CONSTITUTION Article I)
- Must support provenance tracking (CONSTITUTION Article III)
- Schemas must be extensible for future annotation types

## Out of Scope

- Parsing REP files (that's item 007)
- UI rendering of annotations
- STAC storage implementation for annotations
- Organisation-specific annotation extensions

## Dependencies

- Prerequisite for: Item 007 (REP special comments implementation)
- Depends on: Existing schema infrastructure in `/shared/schemas/`

## Notes

This work directly supports the "Prove the Architecture" theme by validating the schema-first approach with a concrete use case. It also enables the tracer bullet workflow by ensuring REP annotations can be properly stored and retrieved.
