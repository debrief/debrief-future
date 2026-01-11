Functional requirements alone do not make a complete spec.

We discovered this when specifying a file loader dialog. The requirements were clear: load file, select store, create plot. But nothing captured whether it would be a single screen or a wizard, what decisions users would face, or how error states should appear.

Our fix: enhance the SpecKit workflow to detect UI features automatically and prompt for interaction design details. When your feature description mentions "dialog", "wizard", or "app", the generated spec now includes sections for decision analysis, screen progression, and UI states.

The approach is deliberately simple: keyword detection rather than ML, backward compatible with existing specs, and false positives preferred over gaps that require backtracking later.

Full details on the planning post.

[Link to blog post]

#FutureDebrief #DeveloperExperience #OpenSource
