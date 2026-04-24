## What We're Building

When we specified the Loader Mini-App, something was missing. The functional requirements were solid: load a file, select a store, create a plot. But we had captured *what* without capturing *how users would experience it*. Single dialog or wizard? What decisions would users face? How would the screen states progress?

We are enhancing the SpecKit workflow to detect when a feature involves user-facing interfaces and automatically prompt for interaction design details. When you run `/speckit.specify` with a description mentioning "dialog", "wizard", or "app", the generated spec will now include a dedicated section for decision analysis, screen progression, and UI states. Backend services and APIs remain unchanged: the section only appears when relevant.

## How It Fits

This enhancement supports Constitution Article VIII ("Specs before code") by ensuring specifications are complete *before* implementation begins. Currently, UI gaps surface during `/speckit.clarify` or planning, forcing teams to backtrack. By capturing interaction design at specification time, we reduce rework and give reviewers a clearer picture of the proposed user experience.

SpecKit itself is our tool for standardised specification workflows. This is the first enhancement to make it context-aware, adapting its output based on feature characteristics rather than treating all features identically.

## Key Decisions

- **Keyword-based detection** rather than NLP or ML. Simple, predictable, and aligned with Constitution Article IX (minimal dependencies). Users can learn which words trigger the UI section.
- **UI indicators take precedence** over service indicators. A "dashboard API" gets the UI section because "dashboard" signals visual interaction.
- **Three-part UI section structure**: Decision Analysis (user goals and choice points), Screen Progression (state table), and UI States (empty, loading, error, success).
- **Backward compatible** by design. Existing specs (000-003) remain valid without modification. The UI section is additive and optional.
- **False positives preferred over false negatives**. When in doubt, include the section. It can be removed manually; missing it requires restarting.
