# Tasks: Browser-Accessible Demo Environment

**Input**: Design documents from `/specs/005-chromeos-testing-setup/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

---

## Evidence Requirements

**Evidence Directory**: `specs/005-chromeos-testing-setup/evidence/`
**Media Directory**: `specs/005-chromeos-testing-setup/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | 7-layer test results summary | After all test layers pass |
| usage-example.md | Screenshots and URL for browser access | After demo is live |
| container-startup.txt | Startup log showing artifact download | After first deployment |
| fly-status.json | Fly.io machine status showing suspend mode | After deployment |
| vnc-screenshot.png | Screenshot of desktop via noVNC | After browser access works |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (DONE) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (DONE) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Project Structure)

**Purpose**: Create demo/ directory structure and basic scaffolding

- [ ] T001 Create demo directory structure `demo/`
- [ ] T002 [P] Create desktop integration directory `demo/desktop/share/applications/`
- [ ] T003 [P] Create MIME types directory `demo/desktop/share/mime/packages/`
- [ ] T004 [P] Create bin scripts directory `demo/bin/`
- [ ] T005 [P] Create samples directory `demo/samples/`
- [ ] T006 [P] Create tests directory `tests/demo/`

**Checkpoint**: Directory structure ready for file creation

---

## Phase 2: Foundation (Core Infrastructure)

**Purpose**: Dockerfile, startup script, and Fly.io configuration - MUST be complete before any user story

- [ ] T007 Create Dockerfile with base image and dependencies `demo/Dockerfile`
- [ ] T008 Create startup script for artifact download `demo/99-debrief-setup`
- [ ] T009 Create fly.toml with Fly.io configuration `demo/fly.toml`
- [ ] T010 [P] Create debrief-open entry script `demo/bin/debrief-open`
- [ ] T011 [P] Create healthcheck script `demo/bin/healthcheck.sh`
- [ ] T012 [P] Create .desktop file for file association `demo/desktop/share/applications/debrief-open.desktop`
- [ ] T013 [P] Create MIME type definition `demo/desktop/share/mime/packages/debrief.xml`
- [ ] T014 [P] Add sample REP file `demo/samples/example-track.rep`

**Checkpoint**: Foundation complete - container can be built locally

---

## Phase 3: User Story 6 - CI Publishes New Artifact (Priority: P1) 🎯 MVP

**Goal**: CI automatically builds and publishes demo artifact to GitHub Releases

**Independent Test**: Push to main branch, verify artifact appears in GitHub Releases

### Implementation for User Story 6

- [ ] T015 [US6] Create CI workflow for artifact build `.github/workflows/build-demo-artifact.yml`
- [ ] T016 [US6] Add venv creation and path rewriting logic to workflow `.github/workflows/build-demo-artifact.yml`
- [ ] T017 [US6] Add VS Code extension packaging step `.github/workflows/build-demo-artifact.yml`
- [ ] T018 [US6] Add artifact upload to GitHub Releases `.github/workflows/build-demo-artifact.yml`
- [ ] T019 [US6] Add verification step for venv portability `.github/workflows/build-demo-artifact.yml`

**Checkpoint**: CI workflow complete - pushing to main creates artifact

---

## Phase 4: User Story 1 - Access Demo from Browser (Priority: P1)

**Goal**: User navigates to URL and sees functional Linux desktop

**Independent Test**: Open https://debrief-demo.fly.dev in browser, verify XFCE desktop loads

### Implementation for User Story 1

- [ ] T020 [US1] Deploy container to Fly.io (initial deployment)
- [ ] T021 [US1] Verify noVNC is accessible at demo URL
- [ ] T022 [US1] Test desktop interaction (mouse, keyboard)
- [ ] T023 [US1] Create Layer 1 test script (URL availability) `demo/bin/test-url.sh`
- [ ] T024 [US1] Create Layer 2 test script (service running) `demo/bin/test-service.sh`
- [ ] T025 [US1] Create Layer 3 test script (VNC connectivity) `tests/demo/test_vnc_connect.py`

**Checkpoint**: Browser access working - users can connect to desktop

---

## Phase 5: User Story 2 - Open Data File via File Manager (Priority: P1)

**Goal**: Right-click .rep file shows "Open in Debrief" and launches VS Code

**Independent Test**: Right-click sample.rep, select "Open in Debrief", verify VS Code opens

### Implementation for User Story 2

- [ ] T026 [US2] Verify VS Code installation via proot-apps in startup script `demo/99-debrief-setup`
- [ ] T027 [US2] Verify .desktop file integration with Thunar
- [ ] T028 [US2] Verify MIME type registration
- [ ] T029 [US2] Create Layer 4 test script (component installation) `demo/bin/test-components.sh`
- [ ] T030 [US2] Create Layer 5 test script (desktop integration) `demo/bin/test-desktop.sh`
- [ ] T031 [US2] Add sample files copy to Documents folder `demo/99-debrief-setup`

**Checkpoint**: File manager integration working - .rep files open in VS Code

---

## Phase 6: User Story 3 - Update Demo to New Version (Priority: P1)

**Goal**: Maintainer changes DEBRIEF_VERSION env var, restarts, new version runs

**Independent Test**: Set DEBRIEF_VERSION=v0.2.0, restart container, verify new version

### Implementation for User Story 3

- [ ] T032 [US3] Add version selection logic to startup script `demo/99-debrief-setup`
- [ ] T033 [US3] Add VERSION file creation in artifact `demo/99-debrief-setup`
- [ ] T034 [US3] Document version update process `specs/005-chromeos-testing-setup/quickstart.md`
- [ ] T035 [US3] Test version switching by setting different DEBRIEF_VERSION values

**Checkpoint**: Version updates working - env var change deploys new version

---

## Phase 7: User Story 6 - Data Pipeline Tests (Priority: P1)

**Goal**: Verify REP files can be parsed and data pipeline works

**Independent Test**: Run debrief-io on sample file, verify GeoJSON output

### Implementation for Data Pipeline Tests

- [ ] T036 [US6] Create Layer 6 test script (data pipeline) `demo/bin/test-pipeline.sh`
- [ ] T037 [US6] Create Layer 7a test script (STAC workflow) `demo/bin/test-stac-workflow.sh`
- [ ] T038 [US6] Create Layer 7b test script (visual smoke) `demo/bin/test-visual-smoke.sh`

**Checkpoint**: Data pipeline tests passing - end-to-end workflow verified

---

## Phase 8: User Story 4 - Cost-Efficient Standby Mode (Priority: P2)

**Goal**: Container auto-stops when idle, auto-starts on access

**Independent Test**: Leave idle for timeout, verify stopped. Navigate to URL, verify starts.

### Implementation for User Story 4

- [ ] T039 [US4] Verify fly.toml has auto_stop_machines = "suspend" `demo/fly.toml`
- [ ] T040 [US4] Verify fly.toml has min_machines_running = 0 `demo/fly.toml`
- [ ] T041 [US4] Test suspend mode by leaving idle, checking Fly.io dashboard
- [ ] T042 [US4] Test cold start time from suspended state

**Checkpoint**: Auto-stop/start working - costs minimized when idle

---

## Phase 9: User Story 5 - Secure Access (Priority: P2)

**Goal**: VNC access requires password authentication

**Independent Test**: Attempt connect without password, verify rejected

### Implementation for User Story 5

- [ ] T043 [US5] Set VNC password via Fly.io secrets
- [ ] T044 [US5] Test authentication - attempt without password
- [ ] T045 [US5] Test authentication - access with valid password
- [ ] T046 [US5] Document password setup in quickstart `specs/005-chromeos-testing-setup/quickstart.md`

**Checkpoint**: Security working - unauthorized access blocked

---

## Phase 10: Test Workflow Integration

**Goal**: CI runs all 7 test layers automatically

### Implementation for Test Workflow

- [ ] T047 [test] Create test workflow `.github/workflows/test-demo.yml`
- [ ] T048 [test] Add Layer 1-3 jobs (availability, service, VNC) `.github/workflows/test-demo.yml`
- [ ] T049 [test] Add Layer 4-6 jobs (components, desktop, pipeline) `.github/workflows/test-demo.yml`
- [ ] T050 [test] Add Layer 7 job (E2E workflow) `.github/workflows/test-demo.yml`
- [ ] T051 [test] Add scheduled trigger for periodic testing `.github/workflows/test-demo.yml`
- [ ] T052 [test] Add workflow_run trigger for post-deploy testing `.github/workflows/test-demo.yml`

**Checkpoint**: Test automation complete - all layers run automatically

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, documentation, media content, and PR creation

### Documentation

- [ ] T053 [P] Update CLAUDE.md with demo environment info `CLAUDE.md`
- [ ] T054 [P] Validate quickstart.md is accurate `specs/005-chromeos-testing-setup/quickstart.md`

### Evidence Collection (REQUIRED)

- [ ] T055 Create evidence directory `specs/005-chromeos-testing-setup/evidence/`
- [ ] T056 Capture test summary with all 7 layers `specs/005-chromeos-testing-setup/evidence/test-summary.md`
- [ ] T057 Record usage example with screenshots `specs/005-chromeos-testing-setup/evidence/usage-example.md`
- [ ] T058 [P] Capture container startup log `specs/005-chromeos-testing-setup/evidence/container-startup.txt`
- [ ] T059 [P] Capture Fly.io status output `specs/005-chromeos-testing-setup/evidence/fly-status.json`
- [ ] T060 [P] Capture VNC desktop screenshot `specs/005-chromeos-testing-setup/evidence/vnc-screenshot.png`

### Media Content (REQUIRED)

- [ ] T061 Create shipped blog post `specs/005-chromeos-testing-setup/media/shipped-post.md`
- [ ] T062 [P] Create LinkedIn shipped summary `specs/005-chromeos-testing-setup/media/linkedin-shipped.md`

### PR Creation (REQUIRED - MUST BE FINAL TASK)

- [ ] T063 Create PR and publish blog: run /speckit.pr

**Task T063 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1
- **Phase 3 (CI/US6)**: Depends on Phase 2 - builds artifact
- **Phase 4 (Browser/US1)**: Depends on Phase 2, needs Phase 3 for artifact
- **Phase 5 (File Manager/US2)**: Depends on Phase 4
- **Phase 6 (Version/US3)**: Depends on Phase 4
- **Phase 7 (Pipeline)**: Depends on Phase 5
- **Phase 8 (Standby/US4)**: Depends on Phase 4
- **Phase 9 (Security/US5)**: Depends on Phase 4
- **Phase 10 (Tests)**: Depends on all previous phases
- **Phase 11 (Polish)**: Depends on all previous phases

### User Story Dependencies

```
                    ┌──────────────────┐
                    │  Phase 1: Setup  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Phase 2: Foundation │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────────┐    │     ┌────────▼────────┐
     │ Phase 3: CI/US6 │    │     │ (Deploy to Fly) │
     └────────┬────────┘    │     └─────────────────┘
              │              │
              └──────┬───────┘
                     │
            ┌────────▼────────┐
            │ Phase 4: US1    │
            │ (Browser Access)│
            └────────┬────────┘
                     │
      ┌──────────────┼──────────────┬──────────────┐
      │              │              │              │
┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
│ Phase 5   │ │ Phase 6   │ │ Phase 8   │ │ Phase 9   │
│ US2: File │ │ US3: Ver  │ │ US4: Stop │ │ US5: Auth │
└─────┬─────┘ └───────────┘ └───────────┘ └───────────┘
      │
┌─────▼─────┐
│ Phase 7   │
│ Pipeline  │
└─────┬─────┘
      │
┌─────▼─────┐
│ Phase 10  │
│ Tests CI  │
└─────┬─────┘
      │
┌─────▼─────┐
│ Phase 11  │
│ Polish/PR │
└───────────┘
```

### Parallel Opportunities

**Phase 1** (all parallel):
```
T001, T002, T003, T004, T005, T006
```

**Phase 2** (after T007-T009):
```
T010, T011, T012, T013, T014
```

**Phase 11** (after evidence directory):
```
T058, T059, T060 (evidence capture)
T061, T062 (media content)
```

---

## Implementation Strategy

### MVP First (Phases 1-4)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation
3. Complete Phase 3: CI/US6 (so we have an artifact)
4. Complete Phase 4: US1 (browser access)
5. **STOP and VALIDATE**: Can access desktop via browser
6. Demo to stakeholders if ready

### Incremental Delivery

1. Setup + Foundation → Container can build
2. Add US6 (CI) → Artifacts auto-publish
3. Add US1 (Browser) → Demo accessible (MVP!)
4. Add US2 (File Manager) → Full desktop integration
5. Add US3 (Version) → Easy updates
6. Add US4 (Standby) → Cost control
7. Add US5 (Security) → Protected access
8. Add Tests → Automated verification
9. Polish → PR and blog post

---

## Task Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Setup | 6 | Directory structure |
| 2. Foundation | 8 | Dockerfile, scripts, config |
| 3. US6 CI | 5 | Artifact build workflow |
| 4. US1 Browser | 6 | Deploy and verify access |
| 5. US2 File Manager | 6 | Desktop integration |
| 6. US3 Version | 4 | Version switching |
| 7. Pipeline | 3 | Data pipeline tests |
| 8. US4 Standby | 4 | Auto-stop configuration |
| 9. US5 Security | 4 | VNC authentication |
| 10. Tests | 6 | CI test workflow |
| 11. Polish | 11 | Evidence, media, PR |
| **Total** | **63** | |

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story
- This is infrastructure - "tests" are shell scripts that verify deployment
- Evidence includes screenshots, logs, and test output
- Final task T063 triggers /speckit.pr for PR creation and blog publishing
