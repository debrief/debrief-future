Collapse two panel sections to focus on your layers, and half the panel sits empty. The layers list renders at a fixed 300px regardless of how much space is available.

The outer flex layout works correctly -- the Layers section container grows when siblings collapse. But one level deeper, the content wrapper isn't a flex container, so the FeatureList component can't claim the space. Two CSS rules fix it: make the wrapper a flex column, let the list grow to fill it. No component logic changes, no new dependencies.

The interesting constraint is that FeatureList's 300px default height is correct in other contexts. The fix uses CSS specificity to override it only inside flexible Activity Panel sections, rather than changing the component itself.

[Read the full planning post](https://debrief.github.io/future/planning-layers-panel-vertical-space-fix/)

#FutureDebrief #MaritimeAnalysis #CSS
