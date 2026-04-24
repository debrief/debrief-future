## What We're Building

We're creating a single, authoritative markdown document that explains how theming works in our Storybook setup for VS Code components. This isn't a generic design system doc—it's specific to the three-layer architecture we've chosen: CSS tokens (`--debrief-*` custom properties), a VS Code adapter that maps the editor's theme variables (`--vscode-*`) into our namespace, and a React ThemeProvider that manages context across the webview.

The guide will include complete token reference tables extracted directly from our source code, a step-by-step how-to for building a themed component, and troubleshooting guidance for common issues.

## How It Fits

Right now, developers adding components to Storybook have to figure out theming by reverse-engineering existing components. That friction slows down contribution and leads to inconsistently themed UI. Scientists and contributors from the DSTL community—many of whom are new to our codebase—need a clear, linear path: "I want to use the primary color. Here's how."

This documentation sits at the intersection of two worlds. On one side, designers and frontend engineers need the technical details: how tokens cascade, why we adapted VS Code's theme variables, where ThemeProvider sits in the component tree. On the other, defence analysts and maritime specialists need to know: "Will my component look right in light and dark mode? What colors are available?"

The guide makes that transparent.

## Key Decisions

**Single markdown file, not a spec.** We could have split this into implementation details, design rationale, and user guide, but that creates fragmentation. Developers need one source of truth.

**Token reference tables extracted from source.** Rather than hand-curating a static list, the guide includes tables generated from our actual `tokens.css` and `vsCodeAdapter.ts`. This means the documentation can't fall out of sync with the implementation.

**Step-by-step component example.** The howto walks through building a real component—let's say a Button—from token setup to Storybook display. Concrete beats abstract.

**Three-layer framing.** We're explaining not just what the layers do, but why they exist. The CSS tokens isolate us from VS Code's API surface. The adapter is the single point of translation. ThemeProvider makes context available to every component without prop drilling.
