Three different definitions of "a GeoJSON Feature" have taken root in our codebase. One has typed coordinates. A second allows nullable geometry and a numeric id. A third drifted off into a service module with its own subtle variations. Each was written by someone solving a real problem. Each silently disagrees with the others. And each is a small violation of the rule we wrote into our own constitution: schema types are derived from LinkML, never hand-written.

This is the kind of thing that doesn't bite you on day one. It bites you later, when a fourth copy appears, or when two of them disagree in a way the type-checker can't catch. So we're fixing it now, before it bites.

The plan: collapse five hand-written TypeScript interfaces plus one drifted copy into a single LinkML-generated class. About thirty consumer files get one-line import changes. No user-visible behaviour shifts. The test gate stays green throughout.

The interesting design question is whether to reuse the existing name or pick a new one — and whether to fold in the Python-side cleanup too, or keep the scope tight.

Full planning post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
