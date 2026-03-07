# Tasks: Colour Scheme Engine with Legend

**Input**: Design documents from `/specs/134-colour-scheme-engine/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/colour-engine.ts

---

## Evidence Requirements

**Evidence Directory**: `specs/134-colour-scheme-engine/evidence/`

---

## Phase 1: Setup

- [x] T101 Create colour-engine directory structure `shared/components/src/colour-engine/`
- [x] T102 [P] Create type definitions `shared/components/src/colour-engine/types.ts`
- [x] T103 [P] Create palette module `shared/components/src/colour-engine/palette.ts`

---

## Phase 2: Foundation (Core Engine)

- [x] T201 [P] [US1] Create age dimension `shared/components/src/colour-engine/dimensions/age.ts`
- [x] T202 [P] [US1] Create vessel-class dimension `shared/components/src/colour-engine/dimensions/vessel-class.ts`
- [x] T203 [P] [US1] Create tag dimension `shared/components/src/colour-engine/dimensions/tag.ts`
- [x] T204 [US1] Create dimension registry `shared/components/src/colour-engine/registry.ts`
- [x] T205 [US1] Implement core engine `shared/components/src/colour-engine/engine.ts`

---

## Phase 3: User Story 1 — Switch Colour Dimension (P1)

**Goal**: Analyst can select Age, Vessel Class, or Tag dimension; exercises update across all views.

- [x] T301 [US1] Create ColourDimensionSelector component `shared/components/src/colour-engine/ColourDimensionSelector.tsx`
- [x] T302 [P] [US1] Create ColourDimensionSelector styles `shared/components/src/colour-engine/ColourDimensionSelector.css`
- [x] T303 [US1] Create ColourDimensionSelector Storybook story `shared/components/src/colour-engine/ColourDimensionSelector.stories.tsx`

---

## Phase 4: User Story 2 — View Legend (P1)

**Goal**: Legend visible alongside map and timeline, explains current colour encoding.

- [x] T401 [US2] Create ColourLegend component `shared/components/src/colour-engine/ColourLegend.tsx`
- [x] T402 [P] [US2] Create ColourLegend styles `shared/components/src/colour-engine/ColourLegend.css`
- [x] T403 [US2] Create ColourLegend Storybook stories `shared/components/src/colour-engine/ColourLegend.stories.tsx`

---

## Phase 5: User Story 3 — Default Behaviour (P2)

**Goal**: When no dimension selected, exercises display in default colour.

- [x] T501 [US3] Implement getDefaultColourAssignment in engine.ts (included in T205)

---

## Phase 6: User Story 4 — Extensible Dimensions (P3)

**Goal**: New dimensions can be registered without modifying existing code.

- [x] T601 [US4] Verify extensibility via custom dimension test (included in engine tests)

---

## Phase 7: Integration & Polish

- [x] T701 Wire colour-engine exports into root `shared/components/src/index.ts`
- [x] T702 Add colour-engine subpath export to `shared/components/package.json`
- [x] T703 Create public API barrel `shared/components/src/colour-engine/index.ts`

### Unit Tests

- [x] T710 [P] Engine unit tests `shared/components/src/colour-engine/__tests__/engine.test.ts`
- [x] T711 [P] Palette unit tests `shared/components/src/colour-engine/__tests__/palette.test.ts`
- [x] T712 [P] Dimensions unit tests `shared/components/src/colour-engine/__tests__/dimensions.test.ts`
- [x] T713 [P] ColourLegend component tests `shared/components/src/colour-engine/__tests__/ColourLegend.test.tsx`
- [x] T714 [P] ColourDimensionSelector component tests `shared/components/src/colour-engine/__tests__/ColourDimensionSelector.test.tsx`

### Evidence Collection

- [x] T720 Capture test summary in `specs/134-colour-scheme-engine/evidence/test-summary.md`
- [x] T721 Record usage example in `specs/134-colour-scheme-engine/evidence/usage-example.md`

### Media Content

- [x] T730 Create shipped blog post in `specs/134-colour-scheme-engine/media/shipped-post.md`
- [x] T731 Create LinkedIn summary in `specs/134-colour-scheme-engine/media/linkedin-shipped.md`

### PR

- [ ] T740 Create PR and publish blog: run /speckit.pr
