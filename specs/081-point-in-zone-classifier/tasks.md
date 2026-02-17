# Tasks: Point-in-Zone Classifier

**Feature**: 081-point-in-zone-classifier
**Branch**: `claude/speckit-start-081-3Btda`
**Generated**: 2026-02-17

## Phase 1: Setup

- [x] T101 Create directory structure for tool spec and golden examples
- [x] T102 Create feature specification `specs/081-point-in-zone-classifier/spec.md`
- [x] T103 Create tool spec `shared/tools/reference/classification/point-in-zone-classifier.1.0.md`
- [x] T104 Create golden examples (basic + all-outside input/output pairs)

## Phase 2: Python Implementation

- [x] T201 Create `services/calc/debrief_calc/tools/reference/classification.py` with `point_in_zone_classifier` function
- [x] T202 Implement ray-casting `_point_in_polygon` algorithm
- [x] T203 Implement zone classification loop (innermost-first priority)
- [x] T204 Register tool via `@tool` decorator with `ContextType.MULTI`
- [x] T205 Add import in `services/calc/debrief_calc/tools/reference/__init__.py`
- [x] T206 Add import in `services/calc/debrief_calc/tools/__init__.py`

## Phase 3: Python Tests

- [x] T301 [test] Create `services/calc/tests/tools/reference/test_classification.py`
- [x] T302 [test] TestClassifyBasic — 7 tests covering zone assignment and pointColors
- [x] T303 [test] TestMetadataPreservation — 4 tests covering field preservation and reclassification
- [x] T304 [test] TestDeterminism — 2 tests covering identical output and geometry preservation
- [x] T305 [test] TestEdgeCases — 7 tests covering error conditions and boundary cases
- [x] T306 [test] TestGoldenExamples — 2 tests validating against golden I/O files

## Phase 4: TypeScript Implementation

- [x] T401 Create `apps/vscode/src/tools/reference/classification/pointInZoneClassifier.ts`
- [x] T402 Implement `toolDefinition` with `MCPToolDefinition` interface
- [x] T403 Implement `execute` function with identical ray-casting algorithm
- [x] T404 Create barrel export `apps/vscode/src/tools/reference/classification/index.ts`
- [x] T405 Register in web-shell `apps/web-shell/src/services/toolService.ts`

## Phase 5: Evidence & Media

- [x] T501 Capture test results in `specs/081-point-in-zone-classifier/evidence/test-summary.md`
- [x] T502 Create usage example in `specs/081-point-in-zone-classifier/evidence/usage-example.md`
- [x] T503 Create shipped blog post in `specs/081-point-in-zone-classifier/media/shipped-post.md`
- [x] T504 Create LinkedIn shipped summary in `specs/081-point-in-zone-classifier/media/linkedin-shipped.md`

## Phase 6: Completion

- [x] T601 Update BACKLOG.md status to `specified`
- [ ] T602 Commit and push all changes
- [ ] T603 Create PR and publish blog: run /speckit.pr
