---

description: "Task list for 003-workflow-roadmap"
---

# Tasks: Workflow Roadmap

**Input**: Design documents from `/specs/003-workflow-roadmap/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/stage-navigation.md, quickstart.md

**Tests**: Test tasks are included because they are explicitly required — spec
success criterion SC-007 and constitution rule 8 both mandate unit, integration and
end-to-end coverage for every feature.

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1..US5)
- Include exact file paths in descriptions

## Path Conventions

Single project. Paths are relative to the repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Record the pre-change baseline so any later failure is attributable.

- [X] T001 Capture the pre-change baseline by running `npm run check`, `npm run test` and `npm run build`, and record the results in `specs/003-workflow-roadmap/baseline.md` (expected: 0 errors, 0 warnings, 13 files / 261 tests passing, build succeeds)
- [X] T002 [P] Confirm end-to-end prerequisites by running `npx playwright install chromium` and `./scripts/setup-e2e.sh`, then `npm run test:e2e`, and record the passing test count in `specs/003-workflow-roadmap/baseline.md` (expected: 21 tests passing)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the single stage axis that all five stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Create `src/lib/composer/stages.ts` exporting a `StageId` literal union of `'binding' | 'layout' | 'preview'`, a `Stage` type of `{ id: StageId; label: string; order: number }`, and an ordered `STAGES` constant. Data-model constraint, verbatim: "The set MUST contain exactly the three ids above, in the order above" and "`order` MUST be unique and contiguous". Use order 1 `binding` label `Binding`, 2 `layout` label `UI Layout`, 3 `preview` label `Preview`
- [X] T004 [P] Add a unit test file `src/lib/composer/stages.test.ts` asserting the stage set has exactly three entries, the ids are in order `binding`, `layout`, `preview`, orders are `1,2,3` and contiguous, and every `id` is a member of the `StageId` union
- [X] T005 In `src/lib/composer/state/composer-state.svelte.ts` remove `mode`, `view` and the `ComposerMode`/`ComposerView` types, and add `activeStage: StageId` and `layoutPresentation: 'visual' | 'json'` as `$state`, plus `selectStage(id: StageId)` and `setLayoutPresentation(value)` methods. Data-model constraint, verbatim: "Default on load and after a reload: `layout`" for the stage and "Default: `visual`" for the presentation
- [X] T006 Extend `src/lib/composer/state/composer-state.svelte.test.ts` with unit tests proving the defaults, that `selectStage` accepts only the three valid ids, and that neither field is written into `state.definition` after selection (data-model constraint, verbatim: "The active stage MUST NOT be persisted into the screen definition")
- [X] T007 Rewrite the workspace switch in `src/lib/composer/Composer.svelte` so rendered content is chosen solely from `activeStage`: `binding` renders the binding panel, `layout` renders palette, canvas and inspector, `preview` renders the rendered view. Remove the `workspaceView` local state and the `mode`/`view` props passed to `src/lib/composer/Toolbar.svelte`. This is the single stage-to-content mapping required by plan.md; do not spread stage branching across components
- [X] T008 In `src/lib/composer/Toolbar.svelte` keep the existing `Compose`/`Binding`, `Edit`/`Preview` and `Visual`/`JSON` controls working as thin shims that delegate to `selectStage` and `setLayoutPresentation`, so the application remains fully usable at this checkpoint. They are removed in later story phases
- [X] T009 Run `npm run check`, `npm run test` and `npm run build` and confirm zero errors, zero warnings, no previously passing test removed or relaxed, and a successful build

**Checkpoint**: A single stage axis drives what is displayed; the app is unchanged from a user's perspective; story implementation can begin.

---

## Phase 3: User Story 1 - See where I am in the authoring flow (Priority: P1) 🎯 MVP

**Goal**: A three-stage indicator at the top of the window showing Binding, UI Layout
and Preview in order, with exactly one stage marked and always matching the content
below it.

**Independent Test**: Open the composer and confirm three stages render in order, exactly
one is marked, and the marked stage matches the workspace shown; move to each stage by
other means and confirm the mark follows.

### Tests for User Story 1 ⚠️

> **NOTE**: Write these tests FIRST, ensure they FAIL before implementation

- [X] T010 [P] [US1] Create `src/lib/composer/workflow/WorkflowRoadmap.svelte.test.ts` as a jsdom component test asserting all three stage labels render in order, that the element carrying the active id is marked with the non-colour active signal, and that exactly one stage is marked
- [X] T011 [P] [US1] Create `src/lib/composer/Composer.svelte.test.ts` asserting that for each of the three `activeStage` values the shell renders that stage's content and marks the matching stage, per contract section 3 ("indicator and content always agree")

### Implementation for User Story 1

- [X] T012 [P] [US1] Create `src/lib/composer/workflow/WorkflowRoadmap.svelte` as a presentational component taking `stages` and `activeStage` props. It MUST render every stage in `order` and MUST NOT decide which content to show (contract section 4)
- [X] T013 [US1] Render the active stage in `src/lib/composer/workflow/WorkflowRoadmap.svelte` using the native `aria-current` attribute in addition to visual distinction, per research R4, so the active state is perceivable without colour alone
- [X] T014 [US1] Render `WorkflowRoadmap.svelte` in `src/lib/composer/Composer.svelte` above the existing toolbar controls, and pass `activeStage` through, satisfying FR-001 and FR-007
- [X] T015 [US1] Confirm `src/lib/composer/workflow/WorkflowRoadmap.svelte` renders all three stages present and legible at narrow window widths when mounted from `src/lib/composer/Composer.svelte`, per FR-007 and quickstart Scenario 1

**Checkpoint**: User Story 1 is functional and independently testable.

---

## Phase 4: User Story 2 - Move between stages by choosing one (Priority: P1)

**Goal**: Clicking a stage navigates to it, and the two redundant toolbar toggle
groups are removed so one control group governs what is displayed.

**Independent Test**: Click each stage in turn and confirm the workspace changes, the
clicked stage becomes marked, re-selecting the active stage is harmless, and the
unsaved indicator stays accurate.

### Tests for User Story 2 ⚠️

- [ ] T016 [P] [US2] Add integration tests to `src/lib/composer/Composer.svelte.test.ts` covering: selecting each stage changes the rendered content in the same transition; selecting the already-active stage changes nothing; unsaved edits survive a stage change and the dirty flag stays accurate
- [ ] T017 [P] [US2] Migrate the end-to-end tests in `e2e/composer.spec.ts` that reference removed controls: 7 references to `preview-toggle` and 4 references to `view-binding` become roadmap stage selections. Preserve each test's original assertion; only the navigation path changes

### Implementation for User Story 2

- [ ] T018 [US2] Wire stage selection in `src/lib/composer/workflow/WorkflowRoadmap.svelte` to call an `onselect` callback, and wire that callback to `selectStage` in `src/lib/composer/Composer.svelte`
- [ ] T019 [US2] Remove the `Compose`/`Binding` control group from `src/lib/composer/Toolbar.svelte`, since the `binding` and `layout` stages replace it (contract section 5)
- [ ] T020 [US2] Remove the `Edit`/`Preview` control group from `src/lib/composer/Toolbar.svelte`, since the `layout` and `preview` stages replace it, and drop the now-unused `mode` prop
- [ ] T021 [US2] Add cases to `src/lib/composer/Composer.svelte.test.ts` proving no stage change leaves a loading or error state visible on the abandoned stage, per FR-011, and that browser back and forward leave the indicator agreeing with the content, per FR-016 and research R5 (stage is deliberately not written to browser history, as the application has no router)
- [ ] T022 [US2] Run `npm run check`, `npm run test`, `npm run build` and `npm run test:e2e`, confirming no previously passing test was removed or relaxed

**Checkpoint**: User Stories 1 and 2 both work; exactly one navigation control group
remains.

---

## Phase 5: User Story 3 - Reach every stage without a pointer (Priority: P2)

**Goal**: Every stage is reachable and operable by keyboard, with the active state
perceivable without colour.

**Independent Test**: Complete a full stage traversal using only the keyboard and
confirm each arrival is announced and the active state is perceivable.

### Tests for User Story 3 ⚠️

- [ ] T023 [P] [US3] Add cases to `src/lib/composer/workflow/WorkflowRoadmap.svelte.test.ts` asserting each stage is focusable and activatable by keyboard, and that the active stage exposes the non-colour active signal required by FR-008

### Implementation for User Story 3

- [ ] T024 [US3] Ensure each stage in `src/lib/composer/workflow/WorkflowRoadmap.svelte` is a natively focusable, activatable control in normal tab order, with no custom arrow-key handling, per research R4
- [ ] T025 [US3] Group the stages under an accessible group label in `src/lib/composer/workflow/WorkflowRoadmap.svelte` so the indicator is announced as one control group

**Checkpoint**: User Story 3 is functional and independently testable.

---

## Phase 6: User Story 4 - Work on the layout in either presentation (Priority: P2)

**Goal**: The layout stage keeps both a visual canvas and a structured presentation, the
choice survives leaving and returning, and the control appears nowhere else.

**Independent Test**: Switch the layout stage to the structured view, navigate to
preview and back, and confirm the structured view is still selected and the control is
absent from the other two stages.

### Tests for User Story 4 ⚠️

- [ ] T026 [P] [US4] Add integration tests to `src/lib/composer/Composer.svelte.test.ts` proving `layoutPresentation` is unchanged by every stage change (data-model constraint, verbatim: "MUST survive leaving and re-entering the layout stage"), and that the presentation control is absent on the `binding` and `preview` stages per FR-010
- [ ] T027 [P] [US4] Migrate the 2 end-to-end tests in `e2e/composer.spec.ts` that use `getByRole('tab')` for the Visual/JSON switch to the new layout presentation control, preserving their assertions

### Implementation for User Story 4

- [ ] T028 [US4] Add the layout presentation control inside the layout stage in `src/lib/composer/Composer.svelte`, bound to `setLayoutPresentation`
- [ ] T029 [US4] Remove the `Visual`/`JSON` tab group from `src/lib/composer/Toolbar.svelte` and its now-unused `view` prop, since the control now lives inside the layout stage (contract section 5)
- [ ] T030 [US4] Run `npm run check`, `npm run test`, `npm run build` and `npm run test:e2e`, confirming no previously passing test was removed or relaxed

**Checkpoint**: User Stories 1 to 4 all work independently; delivered layout
capability is preserved.

---

## Phase 7: User Story 5 - Know the workflow has not been lost (Priority: P3)

**Goal**: Empty, unbound and no-app states present a valid current stage and explain
themselves rather than appearing broken.

**Independent Test**: Reload with no app, select preview on an app with no bindings, and
confirm a stage is still marked and each state is explained in place.

### Tests for User Story 5 ⚠️

- [ ] T031 [P] [US5] Add integration tests to `src/lib/composer/Composer.svelte.test.ts` proving the default stage after load is `layout` and that indicator and content agree on first paint (data-model constraint, verbatim: "Default on load and after a reload: `layout`")
- [ ] T032 [US5] Add cases to `src/lib/composer/Composer.svelte.test.ts` covering the no-app-open state (FR-015) and the no-bindings preview state (FR-014), asserting both explain themselves and leave a valid stage marked

### Implementation for User Story 5

- [ ] T033 [US5] Handle the no-app-open case in `src/lib/composer/Composer.svelte` so the roadmap still marks a valid stage and the workspace explains that no app is open, per FR-015
- [ ] T034 [US5] Handle the no-bindings case in the preview branch of `src/lib/composer/Composer.svelte` so it explains that nothing is bound instead of rendering blank, per FR-014
- [ ] T035 [US5] Verify in `e2e/composer.spec.ts` that the default stage after reload agrees with the content shown, per quickstart Scenario 5

**Checkpoint**: All five user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Guard the consolidation and verify the whole feature.

- [ ] T036 Add the single-navigation-control-group guard to `src/lib/registry/extensibility.test.ts` per research R7, asserting the removed control identifiers no longer appear in composer sources
- [ ] T037 Prove the new guard fails by temporarily reintroducing a removed control identifier in `src/lib/composer/Toolbar.svelte`, confirming the guard fails, then reverting. Constitution rule 10 requires this injection before the guard is accepted
- [ ] T038 [P] Update `README.md` to describe the stage roadmap as the way to navigate the composer, and remove any statement that navigation is controlled by the replaced toggle groups
- [ ] T039 [P] Verify `specs/003-workflow-roadmap/quickstart.md` Scenarios 1 to 8 against the running application and record the outcome in `specs/003-workflow-roadmap/baseline.md`
- [ ] T040 Run the full definition of done: `npm run check` reports zero errors and zero warnings, `npm run test` passes with no previously passing test removed or relaxed, `npm run build` succeeds, and `npm run test:e2e` passes with the main flow exercised in a real browser
- [ ] T041 Confirm FR-018 in `e2e/composer.spec.ts` by verifying that a screen definition saved before this feature loads and previews unchanged, with no change to the format written by `src/lib/persistence/app-library.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3 to 7)**: All depend on Foundational completion
  - US2 depends on US1, since navigation requires the indicator to exist
  - US4 depends on US2, since it removes a control that only exists after US2
  - US3 and US5 depend only on US1
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1, MVP)**: After Foundational - no story dependencies. This is the MVP
- **User Story 2 (P1)**: After US1 - adds navigation on top of the indicator
- **User Story 3 (P2)**: After US1 - independent of US2 and US4, can run in parallel
- **User Story 4 (P2)**: After US2 - removes the presentation tabs US2 left in place
- **User Story 5 (P3)**: After US1 - independent of US2, US3 and US4

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Component before the shell that renders it
- State before the components that read it
- The E2E migration lands in the same phase as the control removal it compensates for
- Story complete before moving to the next priority

### Parallel Opportunities

- Task T002 can run alongside Task T001
- Task T004 can run in parallel with the work that consumes it
- Within US1, T010, T011 and T012 touch different files and can run in parallel
- Within US2, T016 and T017 can run in parallel; they touch different files
- US3 and US5 can be worked in parallel with each other once US1 lands
- Tasks T038 and T039 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 test and component work together (different files):
Task: "Create src/lib/composer/workflow/WorkflowRoadmap.svelte.test.ts as a jsdom component test..."
Task: "Create src/lib/composer/Composer.svelte.test.ts asserting stage/content agreement..."
Task: "Create src/lib/composer/workflow/WorkflowRoadmap.svelte as a presentational component..."
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: confirm three stages render, exactly one is marked, and it
   matches the content (quickstart Scenario 1)
5. Demo: the user can see where they are, though not yet navigate by stage

### Incremental Delivery

1. Complete Setup + Foundational → single stage axis, app unchanged for the user
2. Add US1 → validate independently → demo (MVP: orientation)
3. Add US2 → validate independently → demo (navigation; first control group removed)
4. Add US3 + US5 → validate independently → demo (accessibility and empty states)
5. Add US4 → validate independently → demo (layout presentations preserved, last control removed)

Each step leaves the application runnable and the full suite green, so no step can
leave the repository broken.

### Parallel Team Strategy

1. Team completes Setup + Foundational together, since it touches shared state
2. Once US1 lands:
   - Developer A: US2 (navigation and control removal)
   - Developer B: US3 (accessibility)
   - Developer C: US5 (empty states)
3. US4 follows US2, because it removes a control US2 must leave in place
4. Polish and the guard land last

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps each task to a user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group; each commit MUST independently pass
  `npm run check`, `npm run test` and `npm run build` per constitution rule 14
- Stop at any checkpoint to validate a story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break
  independence
- Total: 41 tasks across 8 phases