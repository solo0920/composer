# Feature Specification: Workflow Roadmap

**Feature Branch**: `003-workflow-roadmap`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "最上方顯示目前工作流程，流程有三個node，第一步是binding，第二步是UI layout，第三步是preview"

> **Baseline correction (verified 2026-10-04 against the code).**
>
> The composer already provides every capability the three stages need; what does
> not exist is a single ordered indicator of where the user is. Verified absent: no
> roadmap, stage bar or stepper component exists.
>
> Navigation is currently spread across **three separate toggle groups** in the
> toolbar, each controlling a different axis:
>
> | Existing control | Axis it controls |
> | --- | --- |
> | `Compose` / `Binding` | which workspace is shown |
> | `Edit` / `Preview` | whether the rendered or editable form is shown |
> | `Visual` / `JSON` | how the canvas is presented |
>
> Because these three axes overlap, the user can reach a combination that no single
> label describes, for example the binding panel in rendered form. This feature
> replaces all three with one ordered set of three stages, where exactly one is
> active at a time and the active stage is visually distinct.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - See where I am in the authoring flow (Priority: P1)

As an editor, I see the three steps of building a screen at the top of the window, in
order, with the step I am currently on clearly distinguished from the others. I know
where I am and what comes next without reading labels scattered across a toolbar.

**Why this priority**: This is the feature's entire reason to exist. It is also the
prerequisite for every other story, because the active stage is what they all change.

**Independent Test**: Open the composer and confirm three stages are present in the
declared order, that exactly one is marked active, and that the active one matches the
content actually being shown. Delivers orientation with no other change.

**Acceptance Scenarios**:

1. **Given** the composer is open, **When** the user looks at the top of the window,
   **Then** three stages are shown in order: binding, then UI layout, then preview.
2. **Given** a stage is active, **When** the user compares it to the other stages,
   **Then** the active stage is visually distinct and the other two are not.
3. **Given** the current stage is UI layout, **When** the user looks at the roadmap,
   **Then** UI layout is the marked stage, and the workspace below shows the canvas.
4. **Given** the window is narrow, **When** the stages do not fit on one line,
   **Then** all three remain reachable and the active stage remains distinguishable.

---

### User Story 2 - Move between stages by choosing one (Priority: P1)

As an editor, I click a stage to go to it, and the workspace below changes to that
stage's content. I never have to guess which control to press, because there is only
one set of controls and it matches the stages.

**Why this priority**: Navigation without a clear target is the problem being solved.
P1 alongside orientation because an indicator that cannot be acted on is decoration.

**Independent Test**: Click each of the three stages in turn and confirm the workspace
below shows that stage's content and that the clicked stage becomes the marked one.
Delivers navigation on its own.

**Acceptance Scenarios**:

1. **Given** the user is on UI layout, **When** the user selects binding, **Then** the
   binding workspace is shown and binding becomes the marked stage.
2. **Given** the user is on binding, **When** the user selects preview, **Then** the
   rendered result is shown and preview becomes the marked stage.
3. **Given** the user selects the stage they are already on, **When** the selection is
   applied, **Then** nothing breaks and the stage remains marked.
4. **Given** the user is on UI layout, **When** the user selects a stage, **Then** the
   canvas view choice is preserved when they return to UI layout.

---

### User Story 3 - Reach every stage without a pointer (Priority: P2)

As an editor who uses the keyboard, I can move between stages and perceive which one is
active without using a mouse, so that the flow is not pointer-only.

**Why this priority**: A navigation bar that only works by clicking excludes users and
fails basic accessibility expectations. It depends only on P1 and P2.

**Independent Test**: Complete the full flow using only the keyboard and confirm each
stage's arrival is announced and its active state is perceivable.

**Acceptance Scenarios**:

1. **Given** focus is elsewhere in the window, **When** the user moves focus to the
   stage controls, **Then** each stage is reachable and operable.
2. **Given** a stage is active, **When** the user is on that stage, **Then** the active
   state is conveyed by something other than colour alone, so it is perceivable without
   colour vision.
3. **Given** the user activates a stage with the keyboard, **When** the stage changes,
   **Then** the new stage's content is shown and its active state is perceivable.

---

### User Story 4 - Work on the layout in either presentation (Priority: P2)

As an editor inspecting a screen's structure, I can switch the layout stage between a
visual canvas and its structured view, and that choice is remembered while I move to
other stages and come back, so that inspecting and arranging stay separate concerns.

**Why this priority**: The two existing layout presentations must not be lost when the
controls are consolidated. Without this, the feature would remove delivered capability.

**Independent Test**: Switch the layout stage to the structured view, navigate to
preview and back, and confirm the structured view is still selected.

**Acceptance Scenarios**:

1. **Given** the user is on UI layout, **When** the user requests the structured view,
   **Then** the layout is presented as structured content instead of the canvas.
2. **Given** the layout stage is showing the structured view, **When** the user visits
   another stage and returns, **Then** the structured view is still selected.
3. **Given** the user is on binding or preview, **When** the user looks for the layout
   presentation choice, **Then** it is not offered, because it only applies to layout.

---

### User Story 5 - Know the workflow has not been lost (Priority: P3)

As an editor returning to the composer after reloading, I land on a stage that makes
sense for starting work, and the roadmap reflects it, so that the flow never appears
to disagree with what is on screen.

**Why this priority**: Prevents a confusing first impression, but any sensible default
is acceptable, so it carries the least risk.

**Independent Test**: Reload the composer and confirm the marked stage and the content
below it always agree.

**Acceptance Scenarios**:

1. **Given** the composer is reloaded, **When** the window appears, **Then** the marked
   stage and the content below it always agree.
2. **Given** an app with no bound components, **When** the user selects preview, **Then**
   the rendered view is shown and explains that there is nothing bound yet, rather than
   appearing broken.
3. **Given** no app is open, **When** the user selects a stage, **Then** the roadmap
   still indicates a current stage and the workspace explains that no app is open.

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- The user selects a stage while a data load is in progress. The stage change MUST NOT
  leave a stale loading or error state attached to a stage the user has left.
- The user selects the binding stage for an app that has no bound components. The stage
  MUST show a usable empty state, not a blank panel.
- The user selects preview for an app whose bound data fails to load. The failure MUST
  be reported in place with wording the user can act on, and the rest of the screen MUST
  still render.
- The window is resized to a very narrow width. All three stages MUST remain present and
  operable.
- The user uses browser back or forward after changing stage. The behaviour MUST be
  predictable; either the stage change is reflected or it is not offered, and it MUST
  NOT leave the roadmap disagreeing with the content.
- The active app is closed or deleted while a stage other than layout is selected. The
  roadmap MUST continue to indicate a valid current stage.
- The user has unsaved edits and switches stages. The edits MUST be preserved, and the
  unsaved indicator MUST remain accurate.
- A screen contains many components and the user switches stages repeatedly. The
  rendered result MUST be identical each time the user returns to preview.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill it out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: The system MUST display, at the top of the composer window, the three
  authoring stages in this order: binding, UI layout, preview.
- **FR-002**: Exactly one stage MUST be the active stage at any time, and the active
  stage MUST be visually distinct from the inactive stages.
- **FR-003**: The active stage's indicator MUST agree with the content shown in the
  workspace below it.
- **FR-004**: The user MUST be able to select any stage, and the system MUST show that
  stage's content and make it the active stage.
- **FR-005**: Selecting the already-active stage MUST leave the application in a valid
  state and MUST NOT discard unsaved work.
- **FR-006**: The system MUST replace the existing scattered navigation controls with
  the stage indicator, so that a user is never offered two competing ways to change
  what is displayed.
- **FR-007**: The stage indicator MUST be positioned above the existing toolbar
  controls, and MUST remain present and legible at narrow window widths.
- **FR-008**: Each stage MUST be reachable and operable without a pointer, and the
  active stage MUST be distinguishable without relying on colour alone.
- **FR-009**: The layout stage MUST offer both a visual canvas presentation and a
  structured presentation, and MUST preserve the user's choice when the user leaves the
  stage and returns.
- **FR-010**: The layout presentation choice MUST NOT be presented on the binding or
  preview stages.
- **FR-011**: A stage selected while data is loading MUST NOT leave a loading or error
  state visible on a stage the user has left.
- **FR-012**: Selecting a stage MUST preserve unsaved edits, and the unsaved indicator
  MUST remain accurate across stage changes.
- **FR-013**: The binding stage MUST show a usable empty state when no component is
  bound.
- **FR-014**: The preview stage MUST explain that nothing is bound when the app has no
  bindings, rather than appearing broken.
- **FR-015**: When no app is open, the stage indicator MUST still indicate a current
  stage and the workspace MUST explain that no app is open.
- **FR-016**: The system MUST define and communicate predictable behaviour for browser
  back and forward after a stage change, and the indicator MUST NOT disagree with the
  content.
- **FR-017**: The stage indicator MUST NOT introduce a component type, an API function
  or a rendering technology, so that the existing extensibility guarantees continue to
  hold.
- **FR-018**: This feature MUST NOT change the saved screen definition format, so that
  apps saved before it existed continue to load unchanged.

### Key Entities *(include if feature involves data)*

- **Stage**: One of the three ordered steps of the authoring workflow: binding, UI
  layout, or preview. Ordered and individually selectable.
- **Active Stage**: The single stage currently in effect. Determines which workspace is
  shown and which stage is highlighted.
- **Layout Presentation**: How the layout stage is shown: a visual canvas or structured
  content. It belongs to the layout stage alone and survives stage changes.
- **Authoring Workflow**: The ordered set of stages, presented together at the top of
  the window as a single indicator.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: An editor identifies the stage they are on correctly, and names the next
  stage, in 100% of trials, within two seconds of opening the window.
- **SC-002**: An editor completes a full binding-to-layout-to-preview pass in under two
  minutes, using only the stage indicator to move between stages.
- **SC-003**: No screen state exists in which the highlighted stage disagrees with the
  content shown, verified across all end-to-end scenarios.
- **SC-004**: Only one control group governs what is displayed; the number of competing
  navigation controls is reduced to a single set of three.
- **SC-005**: All three stages remain operable by keyboard alone, with the active state
  perceivable without colour vision.
- **SC-006**: Existing composer capability is regression-free: the layout stage retains
  both presentations, and saving, reloading, exporting and data binding continue to work
  unchanged.
- **SC-007**: No existing automated test regresses, and the stage behaviour is covered
  by new unit, integration and end-to-end tests.
- **SC-008**: Switching stages completes within one second, including a stage that
  triggers a data load.

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill it out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- The three stages and their order are fixed by this feature and are not user
  configurable in this version.
- Navigation is free: a user may select any stage at any time. Stages are not gates, and
  the system does not block a later stage because an earlier one is incomplete.
- A stage's highlight indicates which stage is current. It does not indicate completion
  or progress, so no per-stage completion state is introduced.
- The active stage is transient editor state. It is not part of the saved screen
  definition and does not survive a reload, so a reload always presents a valid default
  stage with content that agrees with it.
- The roadmap replaces the existing `Compose`/`Binding`, `Edit`/`Preview` and
  `Visual`/`JSON` control groups, as decided when this specification was created. The
  visual and structured layout presentations survive as a choice inside the layout
  stage.
- The three stage capabilities are already implemented and tested. This feature changes
  how the user reaches them and how the current position is shown, not what any stage
  does.
- The product is a single-user, browser-local tool; no shared or concurrent editing
  concerns apply.

## Out of Scope

- Making stages into enforced gates that must be completed in order.
- Per-stage completion or progress indicators, such as a count of unbound components.
- User-configurable stages, or stages beyond the three defined here.
- Reordering, renaming or adding stages.
- Visual drag between stages.
- The direct-manipulation work tracked in the nested-components specification, covering
  drag-to-place, sibling reordering, cross-parent move and delete confirmation.
- Undo history and application import, tracked in the separate composer-completion
  specification.
- Any change to the saved screen definition format or to the rendering path.

## Dependencies

- The existing binding workspace, canvas, inspector, palette, structured view and
  rendered view, which the three stages present. All are already implemented.
- The existing unsaved-changes indicator, which must remain accurate across stage
  changes.
- The nested-components and composer-completion specifications, which this feature
  deliberately does not overlap.