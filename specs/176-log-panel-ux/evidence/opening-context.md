## What We're Building

The Log Panel is the analyst's audit trail -- every operation applied to track data, in order, with the parameters that were used. Right now it renders raw PROV data: tool names, positional parameter indices, ISO 8601 durations. It's accurate, but it forces analysts to mentally decode things like `P0DT0.25S` into "250 milliseconds" and guess whether a parameter value is a colour, a range, or a boolean.

We're redesigning the card face to surface that information visually. Each logged operation becomes a three-row card: a header with a coloured category icon (import, style, calc, filter, or snapshot), a meta row with track badges showing which platform was affected, and a parameters row where each value gets a type-aware chip -- colour swatches for colour values, `#` prefixes for numbers, `↔` indicators for ranges, boolean symbols for toggles. Parameters that were explicitly set (rather than left at defaults) get a small marker so analysts can immediately see what was customised.

## How It Fits

This is a pure UI change within the existing `@debrief/components` shared library. The underlying provenance model is untouched -- the PROV records remain immutable, and services continue to have no knowledge of how their output is rendered. The Log Panel already has a flip-card pattern from Feature 113 (parameter editing); we're only changing the read-only front face. The same cards will render identically in the VS Code extension webview and the web shell.

## Key Decisions

- **Unified 4-tab view mode.** The current implementation has separate controls for layout (timeline vs. by-feature) and detail level (compact vs. normal vs. detailed). We're collapsing these into four tabs: Timeline, By Feature, Compact, and Detailed. Simpler mental model, one selection instead of two.

- **Client-side type inference for parameter chips.** When a tool schema is available (from the existing schema cache), we use its declared types. When it's not, a heuristic function infers the type from the value itself -- recognising colour names, numeric patterns, boolean values. This avoids modifying the provenance data model and keeps rendering fast.

- **Tool categories from manifests, not inference.** Each tool declares its category in a manifest. We considered inferring categories from tool name prefixes, but that's fragile and the manifest approach is explicit. Tools without a declared category get a neutral grey icon.

- **ARIA tablist/tab/tabpanel pattern.** The 4-tab bar uses proper ARIA roles for screen reader accessibility. All semantic information is also conveyed through shape and text, not colour alone.

- **No new dependencies.** Everything is built with React 18 and CSS within the existing component library. The coloured category icons are 18x18px CSS squares, not an icon library.
