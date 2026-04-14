---
type: linkedin
variant: shipped
feature: 119
---

A towed sonar array isn't where the ship is. It's hundreds of metres behind, trailing through the water on a cable. Draw a bearing line from the vessel and you've anchored the entire tactical picture to the wrong point.

Feature 119 fixes that. Every sensor bearing line now originates from the *calculated* array centre, with three modes the analyst can switch between:

— PLAIN backtracks along the vessel's course at the contact time.
— WORM walks backward along the actual track path, so the array correctly lags through turns.
— MEASURED interpolates between real measured array positions, falling back to PLAIN for gaps.

Same algorithm in TypeScript (for the browser) and Python (for the calc tools that generate range plots). Both sides load the same JSON golden fixture, and on this branch every one of the seven contract cases agrees to *zero metres* — IEEE-754 doubles converge exactly because the formulas are identical.

Zero new dependencies. 87 new tests. 1,389 passing in total. WORM mode recomputes 1,000 contacts in 83 ms against a 1-second budget.

This is Phase 4 of 7 in Epic E07 — the Sensor Data Pipeline — for Future Debrief, the open-source rebuild of the maritime tactical analysis platform.

[BLOG_POST_URL]

#FutureDebrief #MaritimeAnalysis #OpenSource #TowedArray
