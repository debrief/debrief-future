🧵 Eight translator sites. Four hand-typed declarations. Two `as never` casts. One vocabulary.

Just shipped the third in a three-PR audit programme consolidating drifted-twin types across the Debrief monorepo (#203 spatial types, #204 `RawGeoJSONFeature`, #205 `DisplayMode` + `PlaybackState`).

Two enum-style types were defined twice in TypeScript with drifted values:

• `DisplayMode`: `'full' | 'trail'` (components) vs `'normal' | 'snailTrail'` (session-state)
• `PlaybackState`: `'playing' | 'paused'` (components) vs `'stopped' | 'playing' | 'paused'` (session-state)

The cost was seven-plus translator ternaries bridging the boundary — plus one disguised silent translator at `timeRangeView.ts:241` that was quietly collapsing `'stopped'` → `'paused'` in the store. And two `as never` casts in the load boundary that silently accepted any persisted value.

After: one schema-rooted vocabulary generated from LinkML into Pydantic + TypeScript + JSON Schema. One template-literal type narrowing `TemporalSlice.playbackState` / `.displayMode` at the boundary. Zero hand-typed copies, zero translator ternaries, zero bypass casts. A new ADR (ADR-022) documenting the stopped ≡ paused rendering rule. Two lint-time guards wired into CI — one for the enum declarations, one validating every `See ADR-NNN` schema reference resolves to a real ADR heading.

622 session-state tests green. 1685 component tests green. 749 schema-adherence tests green. One atomic PR.

The deletion-to-addition ratio is net-negative by design. Every consolidation like this is one fewer place where the two sides of an IPC boundary can silently disagree.

→ [Read the shipped post]({{BLOG_LINK}})

#TypeScript #LinkML #SchemaFirst #TechDebt #TracerBullet
