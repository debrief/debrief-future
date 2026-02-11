# E04 Sample Data Workshop: Identify Realistic Generators for All Result Types

## Problem

The E04 Results Visualization system (#085-#089) needs representative sample data to develop and test the dataset-to-spec transformer, chart renderer, and results panel. Without realistic data from actual Debrief analysis workflows, the renderer risks being built against synthetic fixtures that don't match real tool outputs.

## Proposed Solution

A **collaborative workshop** (human + AI) to identify the realistic tools and operations that produce each result type, then define language-neutral pseudocode generators for them.

- **One session** covering all result types
- **E03 buffer zone demo scenario** as primary context — generators use the move-track -> buffer-zones -> classify-points -> histogram pipeline as the unifying scenario
- Output: pseudocode for each generator + golden fixture files

## Success Criteria

- Workshop identifies which tools/operations produce each result type category (`addition/dataset/*`, `mutation/track/*`, `deletion/*`, `artifact/*`, etc.)
- Each identified generator has language-neutral pseudocode (implementable in Python or TypeScript)
- Golden fixture files conform to MCP content envelope format and pass tool-result schema validation
- Data is realistic — grounded in E03 demo scenario and actual Debrief analysis workflows, not synthetic/random

## Constraints

- Workshop is interactive (human identifies realistic tools/operations, not AI-generated guesses)
- Fixtures must conform to MCP content envelope format (per result_builder.py)
- Must happen before E04 renderer implementation begins

## Out of Scope

- Implementing the generators in Python/TypeScript (separate task after workshop)
- Defining Vega-Lite specs (that's #085's job)
- E03 tool implementation (separate items #078-#082)

## Dependencies

- Prerequisite for: #085 (dataset-to-spec transformer)
- Context from: E03 epic (#078-#084), tool-result.yaml schema

## Epic

E04 Results Visualization
