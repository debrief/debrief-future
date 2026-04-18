# Feature Specification: Verify Electron Loader Entry + Whitelist in Knip Config

**Feature Branch**: `201-knip-loader-config`
**Created**: 2026-04-18
**Status**: Draft
**Input**: User description: "202 from backlog.md — Verify apps/loader electron entry and add knip config to eliminate false-positive unused-file reports under apps/loader/src/main"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean Unused-Code Report for the Loader (Priority: P1)

A maintainer runs the repository's unused-code scanner (`pnpm dlx knip`) as part of a code-quality pass. Today, the report lists twelve files under the Electron loader's main-process directory as "unused", even though they form the loader's live entry tree. The maintainer has to mentally discard those false positives every run, which erodes trust in the tool and makes genuine findings harder to spot. After this change, the report no longer lists any file under the loader's main-process tree as unused — only truly orphaned code appears.

**Why this priority**: This is the primary pain point described in the backlog item. Until the report is clean, the scanner's signal-to-noise ratio for the loader is effectively zero, so downstream hygiene work (responding to real findings) is blocked.

**Independent Test**: Run the scanner against `main` before the change, capture the baseline count of loader main-process files flagged. Run the scanner after the change; confirm zero files under the loader's main-process tree are flagged, and confirm the non-loader portion of the report is byte-identical to the baseline (no other findings suppressed or introduced).

**Acceptance Scenarios**:

1. **Given** the repository is on a commit containing this change, **When** a maintainer runs the unused-code scanner with default arguments, **Then** no file under the loader's main-process source tree appears in the "unused files" section of the report.
2. **Given** the repository is on a commit containing this change, **When** a maintainer runs the unused-code scanner, **Then** the set of unused-file findings for every other package is unchanged from the baseline (no other package is inadvertently silenced, and no new findings appear).
3. **Given** a developer later introduces a genuinely orphaned source file under the loader's main-process tree (not reachable from the declared entry), **When** the scanner runs, **Then** that new file is flagged as unused.

---

### User Story 2 - Confidence the Loader Entry Declaration Is Correct (Priority: P2)

Before silencing any findings, the maintainer needs documented confidence that the flagged files are in fact reachable from a declared Electron main-process entry. The maintainer verifies that the declared entry file exists, that every module flagged by the scanner is imported (directly or transitively) from that entry, and that the loader still produces a working build. The verification result is recorded so future maintainers can trust the whitelist rather than re-litigate it.

**Why this priority**: The backlog item explicitly calls for verification before whitelisting, because whitelisting without verification would mask a genuine problem if the loader were actually dormant. P2 because it is a one-time gate on P1 rather than a user-visible outcome in itself.

**Independent Test**: Inspect the reachability chain starting from the declared entry; confirm every file currently flagged appears in its transitive import graph. Run the loader's build command; confirm it completes without error. Record the verification outcome in the change's evidence trail.

**Acceptance Scenarios**:

1. **Given** the list of twelve files flagged by today's scanner under the loader's main-process tree, **When** a maintainer traces imports from the declared Electron main entry, **Then** every flagged file is reachable (directly or transitively) from that entry.
2. **Given** the verification completes, **When** the maintainer runs the loader's build command, **Then** the build succeeds without errors attributable to this change.
3. **Given** verification reveals a flagged file that is NOT reachable from the declared entry, **When** the maintainer reviews the outcome, **Then** that specific file is excluded from any whitelist and either restored to reachability or removed — it is not silenced blindly.

---

### Edge Cases

- **Loader turns out to be genuinely dormant**: If verification reveals the loader has no working build, no active CI job, and no planned ship date, the maintainer escalates the "archive the loader?" question separately. This feature does not decide that — it only handles the scanner-config outcome for the current, live state.
- **A flagged file is NOT reachable from the declared entry**: Do not whitelist it. Either restore its reachability (if it is a genuine dependency that was accidentally orphaned) or remove it — but do not mask its unused status.
- **Scanner configuration is updated later (tool upgrade, new rules)**: The whitelist should continue to work, or fail loudly in a way that makes the regression obvious. It must not silently stop silencing the loader tree without notice.
- **Another package accidentally matches the whitelist pattern**: The config change must be scoped so narrowly that no other package's findings are affected. The acceptance test in Story 1, Scenario 2 enforces this.
- **The declared entry file moves or is renamed**: The whitelist will stop covering the moved file, and the scanner will begin flagging the loader tree again. This is acceptable (and desired) because it surfaces the rename for review.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST contain a declaration (readable by the unused-code scanner) that identifies the loader's Electron main-process entry file as a scanner entry point, so its transitive import graph is treated as reachable.
- **FR-002**: The loader's main-process entry declaration MUST match the entry the loader actually ships (i.e., the file that the loader's packaging pipeline uses as the Electron main entry). Before this feature is considered complete, this match MUST be verified.
- **FR-003**: After the change, running the unused-code scanner with default arguments MUST NOT report any file under the loader's main-process source tree as unused, provided those files are reachable from the declared entry.
- **FR-004**: The unused-code scanner MUST continue to flag any file under the loader's main-process tree that is NOT reachable from the declared entry (i.e., the whitelist narrows to "reachable from entry", not "everything under this folder").
- **FR-005**: The unused-code scanner's findings for packages OTHER than the loader MUST be unchanged by this feature — no other package's findings may be silenced as a side effect, and no new findings may be introduced.
- **FR-006**: The loader's build command MUST continue to complete successfully after the change (smoke verification only — no new tests required).
- **FR-007**: The change MUST record evidence of the reachability verification (e.g., a short note in the change's evidence trail listing the entry file and confirming each previously-flagged file is reachable), so future maintainers can audit the whitelist without re-deriving the reachability chain.
- **FR-008**: The configuration change MUST be the minimum needed to achieve the outcome. Configuration that silences broader patterns (e.g., "ignore all TypeScript under apps/") MUST NOT be used.
- **FR-009**: If verification reveals the loader is genuinely dormant (no working build, no CI job, no planned ship date), this feature MUST NOT silence the findings. Instead, the maintainer escalates the "archive the loader?" question as a separate decision and this feature is paused.

### Key Entities

- **Scanner Entry Declaration**: A piece of repository configuration that tells the unused-code scanner "treat this file as a reachable starting point; everything transitively imported from it is in use." Attributes: the path it names, the scope (which package or folder it applies to).
- **Loader Main-Process Entry**: The single file that Electron launches as the loader's main process at runtime. Attributes: its path in source, the packaging configuration that names it as the shipped main entry.
- **Reachability Chain**: The transitive import graph rooted at the loader main-process entry. Attributes: the set of files reachable by following imports; whether each currently-flagged file appears in that set.
- **Verification Record**: A short written artefact produced as part of this change that captures (a) the declared entry path, (b) confirmation that each previously-flagged file is reachable, and (c) whether the loader build succeeded. Stored with the change's evidence so future maintainers can audit the whitelist's premise.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the change, the unused-code scanner reports zero files under the loader's main-process source tree as unused (baseline before change: twelve files).
- **SC-002**: After the change, the unused-code scanner's report for every non-loader package is byte-identical to the pre-change baseline — no other findings are suppressed, and no new findings appear.
- **SC-003**: After the change, the loader's build command completes successfully in a clean checkout.
- **SC-004**: Maintainers running the scanner no longer need to manually discard known false positives from the loader main-process tree — the "noise" portion of their review drops to zero for this package.
- **SC-005**: If a developer later adds a genuinely orphaned source file under the loader main-process tree, the scanner flags it within the next run (i.e., the whitelist is scoped to reachability, not to the folder as a whole).
- **SC-006**: The verification record produced by this change identifies the declared entry and confirms reachability for every previously-flagged file, so a future maintainer can audit the whitelist's premise in under five minutes without re-deriving the reachability chain.

## Assumptions

- The twelve files currently flagged by the unused-code scanner under the loader's main-process tree are, at the moment this feature starts, reachable from a single declared Electron main entry. If verification contradicts this (per FR-002 and the edge cases), the feature pauses rather than proceeding with a whitelist.
- The repository's unused-code scanner is configurable at the repository root (via a dedicated config file or a config stanza in the root package manifest). No changes to the scanner itself, or to CI wiring that runs it, are in scope.
- This feature adds the unused-code scanner as a new CI gate running alongside lint / typecheck / test; the gate fails the build if any non-declared unused file is reported under the scanned tree.
- The loader remains in active scope for the project. If it is reclassified as dormant during verification, this feature pauses and the broader "archive the loader?" question is raised separately (per FR-009 and the first edge case).
- "Minimum needed" (FR-008) is interpreted as: the narrowest declaration the scanner's configuration language supports that covers the loader's single declared entry and nothing broader.

## Dependencies

- Introduces one new pinned dev dependency (`knip`, in the root `devDependencies`). Coordinate with backlog #199 per research.md R-007 (the `knip.json` file is co-owned with #199). Otherwise fully parallel with sibling tech-debt items.
