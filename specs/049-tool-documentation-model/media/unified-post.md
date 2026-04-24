---
title: "Building Language-Neutral Tool Documentation Model"
date: 2026-02-05
layout: future-post
author: Ian
track: credibility
excerpt: "A shared specification system ensures Python and TypeScript implementations behave identically"
tags:
  - cross-implementation
  - tool-spec
---

## What We're Building

Future Debrief runs tools in both Python (services) and TypeScript (VS Code extension). When the same tool exists in both languages, subtle differences creep in. A color that rounds differently. An edge case that one handles and the other ignores. These inconsistencies compound.

We're creating a tool specification system: markdown documents that define exactly what a tool does, with enough precision that two developers working independently in different languages produce implementations that behave identically.

Each spec has nine sections: metadata for tooling, MCP descriptions for LLM discovery, formal input/output schemas, a pseudocode algorithm, edge case documentation, golden examples, a changelog, and references. The algorithm section is the core. It uses language-neutral pseudocode that reads naturally to both Python and TypeScript developers without biasing toward either.

Golden examples are JSON file pairs sitting alongside each spec. Run any implementation against the input file; compare the output to the expected output. If they match, the implementation is correct. If not, either the implementation has a bug or the spec needs clarification.

## How It Fits

Tool specs live in `shared/tools/`, parallel to our existing `shared/schemas/`. The hierarchy mirrors tool categories: `track/styling/`, `track/analysis/`, `measure/`. This keeps specs discoverable and lets us build tooling around them later.

We're also adding a Python `@tool_spec` decorator that links implementations to their specs. At import time, it validates the spec exists. If someone references a spec that doesn't exist, they find out immediately, not when the tool runs in production. The decorator also makes specs accessible programmatically for introspection and documentation generation.

## Key Decisions

- **Semver in filenames**: `set-track-color.1.0.md` rather than version in metadata. Multiple versions coexist; implementations reference exact versions.
- **Reference existing schemas**: Inputs use GeoJSON feature schemas, outputs use ToolResults. No new data models.
- **Pseudocode over formal methods**: TLA+ or Z would be more rigorous but create a learning barrier. Python-ish pseudocode with FOR EACH, IF, END IF is readable by anyone.
- **Golden examples as JSON pairs**: Separate files for input and output. Naming convention enables automated test discovery.
- **Python decorator first**: TypeScript annotation infrastructure is future work. Python implementation validates the pattern.

We've shipped a tool specification system that sits between our Python services and TypeScript frontends. Each tool now has a markdown document in `shared/tools/` that defines exactly what it does using language-neutral pseudocode. Four initial specs validate the structure: set-track-color, apply-symbol-style, label-interval, and symbol-interval.

The template has nine sections. Metadata provides machine-readable info for tooling. An MCP section describes the tool in language optimized for Claude to understand when choosing tools. Inputs and Outputs reference our existing GeoJSON and ToolResults schemas. The Algorithm section is the heart—pseudocode detailed enough that two developers working independently produce implementations that behave identically. Edge cases document boundary conditions. Examples include golden input/output JSON pairs. Changelog tracks evolution. References link to related tools and schemas.

Golden examples live alongside specs as JSON file pairs. `set-track-color.basic.input.json` and `set-track-color.basic.output.json` define correct behavior. Run any implementation against the input; if the output matches, it's correct. If not, either the implementation has a bug or the spec needs clarification. This removes ambiguity.

We also built a Python `@tool_spec` decorator in `services/debrief-tools/`. When you annotate a function with `@tool_spec("track/styling/set-track-color.1.0")`, it validates the spec exists at import time. No waiting until runtime to discover a typo. The decorator stores the spec path on the function for introspection—useful when generating documentation or building MCP tool registries. 19 tests pass, covering path resolution, validation, introspection, and error messages.

## How It Works

The pseudocode uses readable keywords like `FUNCTION`, `FOR EACH`, `IF`, `END IF`, `RETURN`. No language-specific syntax. The `set-track-color` algorithm shows the pattern:

```pseudocode
FUNCTION set_track_color(features, color) -> FeatureCollection:
    IF features IS NULL OR features.features IS NULL:
        RAISE ValidationError
    END IF

    FOR EACH feature IN features.features:
        IF feature.properties.kind != "TRACK":
            CONTINUE
        END IF

        feature.properties.style.line.color = color
    END FOR

    RETURN features
END FUNCTION
```

A Python developer reading this sees the structure they need to implement. A TypeScript developer sees the same. Neither language's idioms bias the description. The edge cases table fills in the details—what happens with empty collections, missing properties, invalid colors.

The decorator integrates cleanly:

```python
from debrief_tools import tool_spec

@tool_spec("track/styling/set-track-color.1.0")
def set_track_color(features, color):
    # Implementation follows the spec's algorithm
    pass
```

If `set-track-color.1.0.md` doesn't exist in `shared/tools/track/styling/`, Python raises `ToolSpecError` when the module loads. The function's `__tool_spec__` attribute holds `"track/styling/set-track-color.1.0"` for programmatic access.

## Lessons Learned

The template structure emerged from writing specs for real tools. Early drafts had six sections; we added three more after discovering gaps. The MCP section came from realizing LLMs need different descriptions than humans—Claude doesn't benefit from implementation notes but needs clear guidance on when to use a tool. The Edge Cases table emerged when pseudocode alone left too many questions unanswered.

Pseudocode granularity was harder than expected. Too abstract and implementations diverge on details. Too specific and we're writing code twice in different syntax. The current level feels right—precise enough to eliminate ambiguity, readable enough to not need a parser. The style guide helps: mandatory keywords, no language-specific APIs, types from schemas.

Golden examples proved more valuable than anticipated. They force you to think through complete inputs and outputs. Handwaving stops when you have to produce valid JSON. The examples also caught issues in the specs—if you can't produce an output that matches your algorithm's description, something's wrong with the algorithm.

File organization was straightforward. `shared/tools/` parallels `shared/schemas/`. Categories like `track/styling/` organize tools by domain. Semver in filenames (`set-track-color.1.0.md`) lets multiple versions coexist. An implementation can target v1.0 while v2.0 gets drafted alongside it.

The decorator's validation at import time surfaced a design question: should validation be mandatory or opt-in? We made it default-on with a `validate=False` escape hatch for testing. Production code should fail fast if specs are missing.

## What's Next

TypeScript annotation infrastructure is future work. The pattern's validated with Python; extending it is straightforward when needed.

Immediate next step is writing implementations for the four initial tools. The specs exist, the golden examples define correctness. Both Python and TypeScript teams can work independently and know they'll produce compatible results.

→ [View the template](https://github.com/debrief/debrief-future/blob/main/shared/tools/TEMPLATE.md)
→ [Browse tool specs](https://github.com/debrief/debrief-future/tree/main/shared/tools/track/styling)
→ [See the decorator code](https://github.com/debrief/debrief-future/tree/main/services/debrief-tools)
