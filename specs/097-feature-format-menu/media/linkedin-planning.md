Changing a track's colour should not require running a tool and then correcting its output.

Feature 097 in Future Debrief adds cascading format menus directly on each feature row in the Layers panel. Click the format icon, hover over a property, pick a value -- three clicks, immediate map update. Works for colour, line weight, dash pattern, symbol shape, opacity. Expand a track and each individual position gets its own format icon for per-point overrides.

The interesting constraint: a fixed 16-colour palette aligned with naval display conventions, no custom picker. Turns out preset palettes are faster for 90% of formatting tasks -- the analyst isn't designing a poster, they're distinguishing contacts during a debrief.

Every change is recorded in the provenance log with previous and new values. Batch formatting across mixed feature types shows a union of properties with inapplicable ones greyed out. No new dependencies.

https://debrief.github.io/blog/2026/02/14/planning-feature-format-menu

#FutureDebrief #MaritimeAnalysis #OpenSource
