When the same tool exists in Python and TypeScript, they drift. A color rounds differently. An edge case one handles, the other ignores.

We're building a tool specification system for Future Debrief: markdown documents with pseudocode algorithms and golden input/output examples. Two developers in different languages, working independently, should produce implementations that behave identically.

The spec template has nine sections, but the core is language-neutral pseudocode. FOR EACH, IF, END IF. Readable by anyone, biased toward neither language. Golden examples are JSON file pairs: run your implementation against the input, compare to expected output.

Starting with four track styling tools to validate the structure.

[Read the full planning post](https://debrief.github.io/future/2026/02/05/planning-tool-documentation-model.html)

#FutureDebrief #MaritimeAnalysis #OpenSource
