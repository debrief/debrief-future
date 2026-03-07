The vessel class filter in Future Debrief's STAC browser works, but it shows raw taxonomy paths like `surface/warship/frigate/type23` instead of "Type 23 Frigate." With 20+ vessel types across four hierarchy levels, finding the right one means clicking through nested menus blind.

This week we are adding three things: human-readable labels everywhere, type-ahead search so you can find "Astute" without navigating three levels of menus, and per-node match counts showing how many exercises match each vessel class in the current filtered set. Zero-count nodes get dimmed so analysts never hit a dead end.

All built with zero new dependencies on top of the taxonomy data (#125) and filter bar (#127) already shipped. About six source files, all within the shared component library.

https://debrief.github.io/debrief-future/blog/planning-vessel-taxonomy

#FutureDebrief #MaritimeAnalysis #OpenSource
