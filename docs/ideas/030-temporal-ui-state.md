# Add replay mode and time acceleration to temporal state schema

## Problem

The Time Controller UI has properties that aren't represented in the centralized session state's `temporal` block:
- **Replay mode toggle** - UI has this but no schema property exists
- **Time acceleration** - Schema allows 0.1-100.0 continuous but UI shows discrete [1,2,4,8]

Additionally, there are 5 critical inconsistencies between UI and session state:
1. Display mode enum mismatch (`'normal'|'snailTrail'` vs `'full'|'trail'`)
2. Playback state enum mismatch (3 states vs 2 states - missing 'stopped')
3. Playback rate model mismatch (continuous vs discrete)
4. Playback state persistence violation (should be ephemeral)
5. WebView maintains separate local state instead of using centralized store

## Proposed Solution

1. Add `replayMode: boolean` to the temporal schema
2. Align enum values between session state and UI components
3. Decide on canonical playback rate model (recommend: continuous in schema, UI adapts)
4. Ensure WebView reads from/writes to centralized session state
5. Update shared component types to match session state schema

## Success Criteria

- [ ] `replayMode` property exists in temporal schema and is persisted
- [ ] Display mode enum is consistent (`'normal'|'snailTrail'` everywhere)
- [ ] Playback state enum is consistent (3 states: stopped/playing/paused)
- [ ] Time Controller UI reads temporal state from session store
- [ ] Time Controller UI writes temporal changes back to session store
- [ ] Ephemeral properties (playbackState) reset correctly on load

## Constraints

- Depends on #029 (session-state VS Code integration) being complete
- Must work offline (CONSTITUTION requirement)
- Schema changes should follow schema-first principle (LinkML → derived types)

## Out of Scope

- Adding new UI controls (just aligning existing ones with state)
- Changing the visual design of the Time Controller
- Real-time streaming mode (parked item)

## Related

- Spec: `specs/025-time-controller/spec.md`
- Spec: `specs/029-session-state-vscode/spec.md`
- Session state types: `services/session-state/src/types/temporal.ts`
- UI types: `shared/components/src/TimeController/types.ts`
