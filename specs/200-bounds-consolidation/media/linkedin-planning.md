Two `bounds.ts` files in the same monorepo, 95% byte-identical, one carrying a defensive null-check the other doesn't. The shared version currently throws on features with missing geometry — a latent bug any `SafeFeature` consumer would eventually hit.

Next refactor in Future Debrief is deleting the 161-LOC duplicate, lifting the null-guard into the shared implementation, and pointing the one remaining consumer at `@debrief/utils`. About 140 lines come out, one source of truth goes in, one crash path disappears.

Unglamorous, but this kind of thing is where defence-grade software quality actually lives. Duplicated utilities drift. Drift hides bugs. Bugs in a bounds calculation mean a map that silently misframes an exercise.

The interesting call in the plan isn't the deletion — it's the decision *not* to sweep in a third, genuinely distinct `bounds.ts` that sits in the components package. Scope discipline on a cleanup is a skill worth practising.

Full planning post with the design tradeoff we'd welcome input on: [link TBD]

#FutureDebrief #MaritimeAnalysis #OpenSource
