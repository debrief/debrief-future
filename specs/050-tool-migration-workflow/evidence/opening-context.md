## What We're Building

Legacy Debrief has hundreds of tools built up over two decades. Range bearings, track interpolation, time-variable calculations, sensor coverage, and dozens more. Each one represents domain knowledge encoded by maritime analysts who understood what scientists actually need.

We need to bring that knowledge forward without starting from scratch.

Last week we built the tool specification system (feature 049): language-neutral specs with pseudocode algorithms and golden examples. Now we're building the workflow that uses those specs to migrate tools systematically.

Four slash commands handle the progression: `/tool.discover` scans Legacy Debrief Java source and produces an inventory of candidate tools. `/tool.spec` takes a specific tool and generates its specification by analyzing the Java implementation. `/tool.implement` produces Python and TypeScript code from that spec. `/tool.verify` confirms both implementations match the golden examples captured from the original.

Four agents do the actual work. The legacy-tool-analyst reads Java code and extracts algorithm logic. The tool-spec-author writes specifications following the template. The tool-implementer generates code in both languages. The golden-example-validator compares outputs across implementations.

The missing piece is capturing those golden examples. You can't automatically run an Eclipse RCP application. So we're providing a JUnit harness template that developers integrate into Legacy Debrief to capture input/output pairs as JSON files.

## How It Fits

The commands follow the same pattern as our speckit workflow: commands orchestrate, agents specialize. `/tool.discover` calls the legacy-tool-analyst. `/tool.spec` coordinates between the analyst and spec-author. And so on.

Specs land in `shared/tools/{category}/`, implementations in `services/debrief-calc/` for Python and `apps/vscode/src/tools/` for TypeScript. The structure mirrors what we established in feature 049.

This workflow doesn't migrate all tools. It migrates tools one at a time, with full verification at each step. The goal is confidence, not speed.

## Key Decisions

- **Claude reads Java directly**: No AST parsing or static analysis tools. Claude understands code, comments, and naming conventions well enough to extract algorithm logic. This works even with incomplete or non-compiling code.
- **Manual golden I/O capture**: We can't automate running Legacy Debrief. The JUnit harness template minimizes developer effort while ensuring consistent JSON output.
- **Epsilon tolerance for verification**: 1e-9 for floating-point comparisons. Java, Python, and TypeScript represent floats differently. This tolerance is precise enough for maritime analysis without false failures.
- **Commands invoke agents**: Matches existing speckit pattern. Users get clear entry points; agents encapsulate domain expertise.
- **Both languages from one spec**: The language-neutral specification is the contract. If both implementations pass the same golden examples, they behave identically.
