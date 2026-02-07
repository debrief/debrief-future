---
layout: future-post
title: "Shipped: Tool Migration Workflow for Legacy Debrief"
date: 2026-02-05
track: [momentum]
author: Ian
reading_time: 3
tags: [tool-migration, legacy-debrief, java, agents, shipped]
excerpt: "Four commands and four agents to systematically migrate tools from Legacy Debrief to Future Debrief"
---

## What We Built

Legacy Debrief contains two decades of maritime analysis tools: range bearings, track interpolation, sensor coverage, time-variable calculations. Each tool embeds domain knowledge from analysts who understood what scientists actually need in the field.

We built the workflow to bring that knowledge forward.

Four slash commands handle the migration:

- `/tool.discover` scans Java source and produces an inventory of candidate tools
- `/tool.spec` generates a language-neutral specification from Java implementation
- `/tool.implement` produces Python and TypeScript code from that spec
- `/tool.verify` confirms both implementations match golden examples captured from the original

Four agents do the analysis:

- **legacy-tool-analyst** reads Java code and extracts algorithm logic
- **tool-spec-author** writes specifications following feature 049's template
- **tool-implementer** generates idiomatic code in both languages
- **golden-example-validator** compares outputs with floating-point tolerance

The Java harness template lets developers capture input/output pairs from running Legacy Debrief. No automation magic—just a JUnit helper that exports JSON files in the right format.

## How It Works

The workflow follows a clear progression: discover, spec, capture, implement, verify.

**Discovery** inventories what exists. Point it at a Java source tree and get back a report: tool name, category, complexity estimate, Java class location. Start with simple tools to validate the workflow before tackling complex ones.

**Specification** extracts the algorithm. Claude reads the Java directly—no AST parsing, just code comprehension. It produces a markdown spec with pseudocode, input/output schemas, edge cases, and MCP annotations for the language models that will use the tool.

**Golden capture** is the manual step. The harness template wires into Legacy Debrief's test infrastructure. You call the actual Java tool, capture what goes in, capture what comes out, save as JSON. These files become the source of truth.

**Implementation** translates spec to code. Python lands in `services/debrief-calc/`, TypeScript in `apps/vscode/src/tools/`. Both follow project conventions: type hints, docstrings, test files alongside implementations.

**Verification** runs every golden example through both implementations. Output comparisons use 1e-9 epsilon tolerance for floating-point values. If both pass, the migration is complete. If either fails, the report shows exactly which value at which path differs.

## What We Learned

**Claude reads code well enough**. We considered building Java analysis tooling—AST parsers, symbol resolvers, dependency graphs. Unnecessary. Claude understands Java implementations, including comments and naming conventions that reveal intent. Simpler tools, same results.

**Manual capture isn't a bottleneck**. We debated automating golden I/O capture. Running an Eclipse RCP application programmatically would require substantial infrastructure. The harness template takes ten minutes to wire up per tool. For a one-time migration, that's acceptable.

**Epsilon tolerance matters**. 1e-9 seems tight, but it catches actual errors while allowing normal floating-point representation differences. One failed test during development turned out to be an implementation bug, not a tolerance issue.

**Commands orchestrate, agents specialize**. The pattern from speckit transfers directly. Each command has a clear entry point and expected output. Each agent focuses on one skill: reading Java, writing specs, generating code, comparing outputs.

## Files Created

```
.claude/commands/
├── tool.discover.md
├── tool.spec.md
├── tool.implement.md
└── tool.verify.md

.claude/agents/tools/
├── README.md
├── legacy-tool-analyst.md
├── tool-spec-author.md
├── tool-implementer.md
└── golden-example-validator.md

docs/tool-migration/java-harness-template/
├── README.md
├── ToolCaptureHarness.java
├── pom-fragment.xml
└── example-usage.java
```

## What's Next

The workflow is ready. Now we migrate tools.

First candidates are track styling tools: set-track-color, label-interval, symbol-type. Simple, well-understood, easy to verify visually. They'll validate the workflow end-to-end before we tackle complex analysis tools.

After styling, we move to track analysis: interpolation, time-slicing, filtering. These involve more math, which exercises the floating-point comparison rules.

The goal remains confidence over speed. Each tool migrated with full verification. Each spec reviewed before implementation. Each implementation passing all golden examples before merge.

We'll post updates as tools complete.
