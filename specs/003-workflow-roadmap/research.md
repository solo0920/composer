# Phase 0 Research: Workflow Roadmap

**Feature**: `specs/003-workflow-roadmap` | **Date**: 2026-10-04

All technical unknowns in the plan's Technical Context were resolved from the
repository itself, so no clarification markers remain. Each decision below records what
was chosen, why, and what was rejected.

---

## R1 — Where does navigation state live?

**Decision**: Both `activeStage` and `layoutPresentation` move into the existing
composer state class (`src/lib/composer/state/composer-state.svelte.ts`), which is
already unit-tested.

**Rationale**: Navigation state is currently split across two owners, which is itself a
symptom of the problem this feature fixes:

- `mode` and `view` live in the composer state class and are unit-tested.
- `workspaceView` is local component state inside `Composer.svelte` and therefore
  **cannot be unit-tested at all** — it can only be exercised through a rendered
  component.

Consolidating into the state class makes the whole navigation model testable without a
DOM, and satisfies the constitution's rule that editor state is held separately from
domain data rather than scattered.

**Alternatives considered**

- *Keep `workspaceView` local and pass it up.* Rejected: leaves one axis untestable and
  preserves the split ownership.
- *A dedicated navigation store.* Rejected: a second store would reintroduce two
  sources of truth for one piece of state, violating constitution rule 2 in spirit.

---

## R2 — How are the three stages defined?

**Decision**: As a typed descriptor list in a single module,
`src/lib/composer/stages.ts`, holding an ordered array of `{ id, label, order }` with a
literal union for the ids. The composer shell maps stage to content in exactly one
place.

**Rationale**: The constitution's rule 1 forbids the editor branching on component type
literals so that the palette stays registry-driven. Stages are not component types, so
rule 1 does not bind them directly — but the same failure mode applies. If stages were
hard-coded as conditionals spread across the roadmap, the toolbar and the shell, adding
or reordering a stage would mean editing three components, which is precisely the
coupling this feature exists to remove.

A typed descriptor list keeps the stage set as data while satisfying rule 4's typed
extension points: the id is a literal union, not a bare string.

**Alternatives considered**

- *Read stages from a registry, like components.* Rejected as over-engineering: stages
  are fixed at three by the specification, they are not user-extensible, and building a
  registry for them would be speculative abstraction, which the constitution's scope
  discipline forbids.
- *Hard-code three buttons in the component.* Rejected: reordering or renaming would
  require editing the component.

---

## R3 — What happens to the Visual/JSON choice?

**Decision**: It becomes `layoutPresentation`, a separate state value owned by the
layout stage only. It is preserved when the user leaves the stage and returns, and it
is not offered on the binding or preview stages.

**Rationale**: Two of the three replaced toggle groups are `Compose|Binding` and
`Edit|Preview`, which the roadmap absorbs. The third, `Visual|JSON`, controls a
different axis: not *where* the user is, but *how* one stage is presented. Collapsing
it into the stage union would either delete delivered capability or create a fourth
stage, which the specification forbids by fixing the stage count at three.

**Alternatives considered**

- *Add a fourth stage for the structured view.* Rejected: the specification fixes three
  ordered stages, and the structured view is a presentation of layout, not a workflow
  step.
- *Discard the choice on stage change.* Rejected: violates FR-009 and deletes working
  capability.

---

## R4 — How is the stage indicator made accessible?

**Decision**: Render the stages as a labelled group of ordinary buttons, each carrying
the active state through the native `aria-current` attribute in addition to colour, and
reached by normal keyboard focus order. No custom roving-tabindex keyboard handling.

**Rationale**: FR-008 requires operability without a pointer and an active state
perceivable without colour. Three always-visible buttons satisfy both using native
semantics. A custom tablist with roving tabindex is the more "correct" pattern for a
composite widget, but it requires manual arrow-key handling and a single tab stop,
which buys nothing for three peer buttons that are each independently meaningful.

**Alternatives considered**

- *Full ARIA tablist with roving tabindex.* Rejected: manual focus management is a
  regression risk for no user benefit at three items, and it would make the stage
  indicator a focus trap for keyboard users if implemented incorrectly.
- *Colour alone.* Rejected: fails FR-008 and fails accessibility expectations outright.

---

## R5 — What happens on browser back and forward?

**Decision**: Stage changes are not written to browser history. The behaviour is defined
as "stage is session state and is not reflected in the URL", and this is communicated
to the user as a documented limitation.

**Rationale**: FR-016 requires predictable, communicated behaviour. Verification found
the application has **no router and no history manipulation at all** — the only URL
usage in the codebase is `new URL()` inside the API client for query parameters. There
is no mechanism to synchronise with.

Adding one would mean introducing history entries, a navigation listener, and a
reconciliation path for the case where history and current state disagree. That is a
routing concern belonging to a different feature, and it would exceed this feature's
scope. The honest resolution is to define the behaviour explicitly rather than leave it
undefined, which is what FR-016 asks for.

**Alternatives considered**

- *Push a history entry per stage change.* Rejected: introduces routing concerns and a
  reconciliation problem, and is outside the specified scope.
- *Put the stage in the query string.* Rejected: same routing surface, and the app is
  client-only with no server to interpret it.

---

## R6 — How are the affected end-to-end tests migrated?

**Decision**: Update all 10 affected tests inside the same milestone as the
consolidation. The replacement selectors are chosen once and applied uniformly.

**Rationale**: Verification counted 13 references to replaced controls across 10
distinct end-to-end tests: 7 using `preview-toggle`, 4 using `view-binding`, and 2
using the Visual/JSON tabs. Leaving these to a follow-up would leave the suite red,
which the constitution's rule 14 forbids for a milestone commit.

The migration is mechanical: `preview-toggle` clicks become roadmap stage selections,
and `view-binding` clicks become the binding stage selection. The Visual/JSON
assertions become layout-presentation selections inside the layout stage. The
behaviour each test asserts is unchanged; only how the user reaches the stage changes.

**Alternatives considered**

- *Keep the old test ids as hidden aliases.* Rejected: preserves the ambiguity the
  feature removes and weakens the tests by keeping two ways to reach one state.

---

## R7 — What guard prevents the three-axis problem from returning?

**Decision**: Extend the existing source-scanning guard
(`src/lib/registry/extensibility.test.ts`) with a check that the composer contains no
second navigation control group, expressed as: the removed control identifiers no longer
appear in composer sources.

**Rationale**: The specification's measurable outcome SC-004 is "only one control group
governs what is displayed". Nothing currently prevents a future change from adding
another toggle that overlaps the stage axis — the exact problem being fixed. This
project has an established pattern for architectural guards, and the constitution's
rule 10 requires the guard be **proven to fail by injecting a violation first**, then
reverted, before it is accepted.

**Alternatives considered**

- *No new guard.* Rejected: SC-004 would be an unverifiable claim, which rule 15
  forbids.
- *A runtime assertion that only one control is rendered.* Rejected: weaker than a
  source check, because a re-introduced control could still render identically.

---

## Unresolved Items

None. Every technical unknown in the Technical Context was resolved from repository
evidence. No unresolved clarification marker remains in this feature's specification,
and none was required here.

One pre-existing gap is recorded and deliberately **not** addressed here, because it is
unrelated to navigation: constitution rule 7 requires `readPath` and `parsePayloadRef`
to share one set of test cases, and they currently have separate suites. Fixing it in
this milestone would violate rule 13's scope discipline.