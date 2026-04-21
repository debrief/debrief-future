An analyst has twelve Scenes captured from a three-week exercise, walks into a briefing room, opens the plot, and presses Forward. The map flies to the first viewport while the time slider tweens to the right instant. The stakeholder watches the story; the analyst isn't scrubbing and zooming in front of them.

That's the shape of the next Future Debrief slice (#217): the Storyboard panel, transport controls, scoped Left/Right keys, on-map Scene rectangles, and a native modal that hard-blocks playback if a Scene's underlying feature no longer exists.

What makes the planning interesting is how much of it is orchestration. The CRUD core came with #215. Capture came with #216. #217 adds no new schema, no new runtime dependencies, no Python. Two animations — Leaflet `flyTo` and an RAF tween on the time slider — share a `transitionId` so a mid-flight scrub cancels both cleanly. The scrub window reuses the existing `timeFilter` slot instead of adding a new one.

Three questions we'd value outside perspectives on — scrub-window lock vs snap-back, whether flyTo stays welcome at the twelfth transition, and how busy Scene rectangles should get — are in the post:

{{POST_URL}}

#FutureDebrief #MaritimeAnalysis #OpenSource
