# Research — Active-Storyboard Selection Persistence

**Feature**: #237
**Date**: 2026-05-06

This document resolves the open implementation questions for spec
#237 before design. Each section follows the *Decision / Rationale /
Alternatives considered* format. There were no `[NEEDS
CLARIFICATION]` markers in spec.md; all unknowns were on the
implementation side and are settled here.

---

## 1. Where does persistence live?

**Decision**: Per host, behind a typed `ActiveStoryboardSelectionStore`
adapter interface declared in `@debrief/components`. VS Code's
adapter wraps `@debrief/config` (Node, file-backed at the
XDG-equivalent `config.json`). Web-shell's adapter wraps
`localStorage` (per-origin, per-browser-install). The two stores do
not sync.

**Rationale**:

- The spec explicitly requires per-host robustness ("close+reopen
  survives in either host" — FR-008) but explicitly does *not* require
  cross-host sync (Out of Scope §, Assumptions §). That permits
  diverging backends.
- VS Code already runs in a Node context and the project already
  ships `@debrief/config` with file locking, atomic writes, and
  graceful corrupted-file fallback (`shared/config-ts/src/storage.ts`,
  `services/config/src/debrief_config/storage.py`). Reusing this
  service is cost-free.
- Web-shell currently has *no* `@debrief/config` consumer (research
  confirmed: `@debrief/config` is not imported from web-shell
  source). Mounting it into the browser would require either a
  bundle-time browser backend in `@debrief/config` itself, or a
  Vite-middleware HTTP adaptor talking to a Node-side config
  service — both of which add infrastructure costs that the
  "lighter-touch starting point" backlog steer rejects.
- `localStorage` is the smallest adequate local store for a
  per-origin browser PWA. It is sync, fits the panel-mount lifecycle
  exactly, and is already understood by the team via the #236
  `stacWriterIdb` pattern (browser-storage-behind-an-interface).

**Alternatives considered**:

- **Single shared backend (extend `@debrief/config` to grow a browser
  driver)**: rejected for scope. This is a desirable evolution of
  `@debrief/config` but it is a separate, cross-cutting feature with
  its own design, tests, and migration story. Promoting it into
  #237's slice would inflate this PR well beyond "lighter-touch".
- **Vite middleware → Node `@debrief/config` from web-shell over
  HTTP**: rejected. Adds a server runtime dependency to web-shell's
  static-deploy story (Heroku review apps, future PWA dist), and
  doesn't even improve the user-visible behaviour — the per-host
  isolation is still per-deployment.
- **IndexedDB for web-shell**: rejected. Same rough shape as
  `stacWriterIdb`, but a single per-plot string per analyst doesn't
  justify async I/O, schema bumps, or the 100-line minimum that
  IndexedDB demands. `localStorage` covers the spec's success
  criteria; if a future feature needs structured storage of
  larger / more complex per-user state, the adapter interface absorbs
  the migration without rippling into either host's mount layer.

---

## 2. How is the selection keyed?

**Decision**: Both adapters store a **single** entry whose value is a
JSON-encoded `Record<itemPath, storyboardId>` map. The map key is the
plot's existing `itemPath` (the absolute STAC `item.json` path that
both hosts already use to identify open plots). The map value is the
Storyboard's `properties.id` (the same stable ID
`getActiveStoryboardDefault` operates on).

- `@debrief/config` key: `activeStoryboardSelections` (top-level
  preference name; the value is the JSON-stringified map).
- `localStorage` key: `debrief.activeStoryboardSelections` (the
  `debrief.` prefix is a per-app namespace consistent with future
  web-shell `localStorage` usage).

The shared `@debrief/components` interface is value-shape-agnostic —
it exposes `get(itemPath): string | null` and
`set(itemPath, storyboardId | null)` and hides the JSON-map detail
inside the adapters.

**Rationale**:

- `@debrief/config`'s `PreferenceValue` is **scalar only**
  (`string | number | boolean | null`) — confirmed by reading
  `services/config/src/debrief_config/models.py:22` and
  `shared/config-ts/src/types.ts:22`. A `Record<...>` cannot be
  stored as a structured preference today.
- A single JSON-string entry is trivially supported (the value is a
  `string`), atomic against last-writer-wins (FR-013), and avoids
  polluting the preference namespace with one entry per plot.
  Concurrent writes from two sessions clobber each other —
  acceptable per FR-013 / spec edge cases — without leaving the map
  in a half-state.
- `itemPath` is the canonical plot key on both sides:
  `apps/vscode/src/services/storyboardEdit.ts:236` (`itemPath: string`
  in `StoreContext`) and `apps/web-shell/src/App.tsx:462` (the same
  string is threaded into `currentPlot`). Reusing it costs zero new
  identity infrastructure and naturally satisfies FR-002 (independent
  records per plot, even if Storyboard names collide).

**Alternatives considered**:

- **One preference per plot, key = `activeStoryboard:<encoded
  itemPath>`**: rejected. Pollutes the preference namespace; on
  Windows the `:` collides with drive-letter syntax in the path,
  forcing URL-encoding of the path; produces N entries per analyst
  with no cleanup story. The single-map approach is cleaner.
- **Hash the `itemPath`**: rejected. Loses human-readability of the
  store contents (useful when debugging "why didn't my selection
  restore?" on a real installation) and gains nothing — the path is
  not sensitive data; both hosts already log it.
- **Persist the storyboard `name` instead of `id`**: rejected. Names
  are mutable and may collide across plots; IDs are stable and
  unique per the #215 schema invariants.

---

## 3. Where do reads and writes hook in?

**Decision**:

- **VS Code** (`apps/vscode/src/services/storyboardPlayback.ts`):
  - `onPlotOpened(documentUri, plot)` (the lifecycle entry-point that
    constructs the per-plot state, around line 240): after
    `state.activeStoryboardId = active?.properties.id ?? null` (line
    265 today), call the store. If the store returns a non-null
    Storyboard ID **and** that ID is present in `plot.features`,
    overwrite `state.activeStoryboardId` with it. Otherwise leave the
    default-fallback value.
  - `setActiveStoryboard(documentUri, storyboardId)` (line ~360 today,
    the dropdown entry-point): after the existing
    `state.activeStoryboardId = storyboardId` write, call the store
    `set(itemPath, storyboardId)`. The `itemPath` is plumbed from
    `EditSessionManager.resolveStoreContext(documentUri)` at the same
    moment the rest of the storyboard CRUD already resolves it
    (`apps/vscode/src/services/storyboardEdit.ts:244`).

- **Web-shell** (`apps/web-shell/src/StoryboardPanelMount.tsx`):
  - Add a new `itemPath: string` prop, threaded from `App.tsx`'s
    `currentPlot.itemPath`.
  - Replace the bare `useState<string | null>(null)` for
    `activeOverrideId` with an effect that runs on `(itemPath, plot)`
    change: read the store, validate the returned Storyboard ID is
    still in `plot`, and set `activeOverrideId` accordingly. If the
    store returns `null` or the ID is stale, leave `activeOverrideId`
    `null` so the existing `getActiveStoryboardDefault(plot)` path
    takes over.
  - Update the existing `setActiveOverrideId(storyboardId)` call sites
    (lines 320–325 and the post-create update at line 361) to call
    the store's `set(itemPath, storyboardId)` immediately after the
    React state update.

- **No changes** to the shared `StoryboardPanel` component or
  `getActiveStoryboardDefault`. The fallback rule, the dropdown UX,
  the scene-row rendering, and the `onActiveStoryboardChange` prop
  contract all remain identical to #235.

**Rationale**:

- Pinning persistence to the host mount layers (rather than the
  shared component) keeps `@debrief/components` portable to other
  potential hosts (Jupyter, Loader, future Storybook environments)
  without forcing them to bring a `Store` along. It also matches the
  existing #235 architecture, where the shared panel is "dumb" and
  the hosts wire all data flow.
- Both touchpoints (init in `onPlotOpened` / mount effect; write in
  `setActiveStoryboard` / `onActiveStoryboardChange`) are the
  *minimum* set required to satisfy FR-003 (write immediately on
  override) and FR-005 (read on plot open).

**Alternatives considered**:

- **Hook persistence inside `getActiveStoryboardDefault`**: rejected.
  The default-selection rule is pure (input: a plot; output: a
  Storyboard) and lives in `@debrief/components` where there is no
  ambient store. Adding a side effect would couple the shared
  package to a host-specific persistence mechanism.
- **Hook persistence in a shared `useStoryboardEditReducer` action**:
  rejected. The reducer is shared between hosts (used by both
  `StoryboardPanelMount.tsx` and the VS Code panel webview) and
  again has no ambient access to a host-specific store; pushing
  through it would force every host to register a side-effect
  middleware.

---

## 4. Failure modes and fallbacks

**Decision**: Read failure → silent fallback to
`getActiveStoryboardDefault()`. Write failure → silent degrade to
session-only (today's behaviour). Stale recorded ID (Storyboard
deleted in another session) → fallback to default; the next override
or successful default-write replaces the stale entry. No banners, no
toasts, no modals.

**Rationale**:

- Spec FR-006 / FR-012 / SC-004 / SC-006 all require silent
  degradation. The user must not see the persistence layer as a
  visible surface unless it actively does the right thing.
- Both adapter backends already give us safe primitives:
  `@debrief/config` returns the `default` argument on missing/corrupt
  config (`shared/config-ts/src/storage.ts:23–46`) and uses
  `proper-lockfile` with a 5-second timeout that throws on contention;
  `localStorage.getItem` returns `null` on missing keys and throws
  `QuotaExceededError` / `SecurityError` only on writes. The adapters
  catch these explicitly and translate to `null` reads / no-op writes.
- "Silent" does not mean "untraceable" — both adapters write a single
  non-fatal entry to the host's existing logger on a caught exception,
  consistent with FR-012's "single non-fatal log entry is acceptable".

**Alternatives considered**:

- **Surface a toast on write failure**: rejected. A user who can't
  persist their selection has typically configured their browser /
  OS to disallow storage (incognito, full disk, locked-down profile).
  Telling them once per click that "your selection won't persist" is
  noise; they'll discover it on next reload. Spec FR-012 explicitly
  forbids interrupting the analyst.
- **Fail closed (refuse to render the panel) on read failure**:
  rejected — directly contradicts FR-012 ("MUST NOT prevent the
  panel from rendering").

---

## 5. Schema impact

**Decision**: **No LinkML schema change.** No `is_active` slot is
added to `StoryboardFeature`. The Storyboard schema, the round-trip
fixtures, and the generated Pydantic / JSON Schema / TypeScript
artifacts are all untouched.

**Rationale**:

- This was the explicit backlog steer ("Option (b) is the
  lighter-touch starting point"), the explicit Out-of-Scope clause in
  the spec, and the rationale in #235 research §8 ("not in #215's
  schema; adding it is breaking; ergonomically wrong (state on a
  Feature about how a UI displays it)"). No new evidence has emerged
  to revisit it.
- A schema change would force a Storyboard schema bump, regeneration
  of derived types, an update of round-trip fixtures, and a
  cross-organisation interop step (any contrib extension that
  consumes `StoryboardFeature` would need to verify it still parses).
  All of that is disproportionate for a per-user UI preference.

**Alternatives considered**:

- **Add `is_active` slot now**: rejected; future feature if
  shared / organisation-published "default storyboard" semantics
  emerge.

---

## 6. Test strategy

**Decision**:

- **Unit tests** (Vitest) for each adapter — mock `@debrief/config`
  (VS Code) and `localStorage` (web-shell), verify
  `get` / `set` / null semantics / corrupted-value handling.
- **Component tests** (Vitest + RTL) for `StoryboardPanelMount.tsx`
  — assert that mounting with a seeded store value selects the
  recorded Storyboard, that switching the dropdown writes the store,
  and that mounting with a stale value falls back to the default.
- **Service test** for `storyboardPlayback.ts`'s `onPlotOpened` and
  `setActiveStoryboard` — same three behaviours, against an injected
  fake store that records calls.
- **Playwright E2E** in `apps/web-shell/playwright/tests/` covering
  US1's full open → switch → reload → still-switched flow against a
  multi-storyboard fixture plot, plus US2's stale-fallback by
  pre-seeding `localStorage` to a Storyboard ID not in the plot.

**Rationale**:

- Acceptance scenarios in spec.md US1 / US2 / US3 map 1:1 to the
  above tests (see quickstart.md §Testing for the explicit mapping).
- Unit + component layers are cheap and catch regressions in the
  adapter contract; Playwright catches host-wiring regressions
  (e.g. someone forgetting to thread `itemPath` through `App.tsx`)
  that unit tests can't see.
- Per Article XII / preview-app deployment, the Playwright spec also
  produces the screenshots / GIF for the eventual blog post,
  satisfying media coverage at zero extra cost.

**Alternatives considered**:

- **VS Code chrome-level Webview Playwright test**: rejected. The
  user-visible "reopen-on-pinned" behaviour is symmetric across
  hosts and the web-shell run already exercises the shared
  `StoryboardPanel`. A parallel openvscode-server run would add
  ~10 minutes per CI build with no new coverage.
- **Skip the `localStorage` mock and rely on jsdom's default**:
  rejected — explicit mocks let us simulate quota/security failures
  required by FR-012 / SC-006.

---

## 7. ESLint / Article-IV.4 enforcement

**Decision**: Add `apps/web-shell/src/services/activeStoryboardSelectionStoreWebShell.ts`
to the existing `no-restricted-globals` exception list in
`shared/eslint-rules/no-direct-persistence-in-frontend.cjs`
(currently allows `localStorage` only in
`apps/web-shell/src/services/stacWriterIdb.ts` and
`apps/web-shell/src/services/stacWriterCapability.ts` — research
confirmed at lines 80–86 of that rule file).

**Rationale**:

- Article IV.4 mandates that "frontends may persist data only via
  the unified writer abstraction". For plot data, that abstraction
  is `@debrief/stac-writer` (the writer-abstraction pattern).
  For per-user UI state, the canonical abstraction in the project
  today is `@debrief/config` — but as established in §1, a browser
  backend for `@debrief/config` is out of scope for #237. The
  adapter file IS the per-host write boundary for user-state
  persistence; adding it to the existing exception list (rather
  than adding a fresh rule or carving out a directory) is the
  smallest possible change and the most reviewable.
- The exception is single-file, single-rule, named to match the
  existing convention.

**Alternatives considered**:

- **Add a fresh "user-state" exception list**: rejected. Two
  exception lists policed by the same rule add review overhead with
  no gain — a reviewer of this PR can see the new file in the same
  list and immediately recognise the pattern from #236.
- **Move to IndexedDB so the existing `stacWriterIdb` exception
  covers us automatically**: rejected — see §1.

---

## 8. Cross-host migration / backwards compatibility

**Decision**: No migration is performed and none is required.
First-open of any plot under the new behaviour reads `null` from the
store (no entry exists), so the panel falls back to
`getActiveStoryboardDefault()` exactly as today. Plot files produced
by the new behaviour are byte-identical to plots produced before the
feature shipped (SC-003).

**Rationale**:

- This is the lightest-possible upgrade path for analysts: the first
  time they open a familiar plot, nothing changes; the first time
  they switch to a non-default storyboard, the new behaviour starts.
  Zero onboarding, zero migration tooling, zero "your config has
  been migrated" notification.
- For organisations on mixed host versions (one workstation upgraded,
  another not yet), the older host produces and consumes plot files
  that the newer host treats as "no recorded selection", and the
  newer host's recorded selections are stored only in the analyst's
  user-config / browser localStorage where the older host doesn't
  look anyway. No file conflict is possible.

**Alternatives considered**:

- **Migration script that pre-seeds the store from
  `getActiveStoryboardDefault()` for every plot in the analyst's
  recent-files list**: rejected. Pre-seeding would change the
  user-visible default (`getActiveStoryboardDefault()` is computed
  fresh on every open today), and the value of pre-seeding is zero
  — the analyst wouldn't notice any difference.
