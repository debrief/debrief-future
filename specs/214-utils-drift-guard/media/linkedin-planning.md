Consolidating duplicate code is the easy part. Keeping it consolidated is the part that quietly fails six months later, when a well-meaning contributor adds a local `bounds.ts` back and nobody notices until the next bug lands in only one copy.

The last feature on Future Debrief pulled every duplicate `calculateBounds` out of the apps and left a single canonical version in `@debrief/utils`. This next one is the small, cheap follow-through: an ESLint rule that reads `@debrief/utils`'s own export list and refuses to let any file under `apps/*` redeclare a name that's already there. Legitimate barrel re-exports pass. Internal helpers pass. A fresh redeclaration fails with a message naming the file, the symbol, and the canonical import to use instead.

The part I'd like outside eyes on: the rule derives its forbidden set from the package's source, so it extends automatically when new exports land. Should that pattern generalise to the other `@debrief/*` packages as a policy, or earn its keep one package at a time?

[BLOG_POST_URL]

#FutureDebrief #MaritimeAnalysis #OpenSource
