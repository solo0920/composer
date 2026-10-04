# Implementation Plan: Workflow Roadmap

**Branch**: `003-workflow-roadmap` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-workflow-roadmap/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Replace the composer's three overlapping navigation toggle groups with one ordered,
always-visible three-stage indicator at the top of the window — **Binding → UI Layout →
Preview** — where exactly one stage is active and the active stage is visually distinct.

The three stage capabilities already exist and are not rebuilt. The work is to
consolidate navigation state, make the current position visible, and preserve the two
layout presentations that the consolidation would otherwise destroy.

Technical approach: introduce a typed stage model in the composer layer, move all
navigation state into the already-unit-tested composer state class, render a new
roadmap component above the existing toolbar, and map stage to workspace content
through that single state value rather than through three independent axes.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict), Svelte 5.56.7 (runes), SvelteKit 3

**Primary Dependencies**: SvelteKit, Svelte 5, shadcn-svelte (bits-ui), Tailwind v4,
Zod 4. Runtime dependencies are limited to `clsx` and `tailwind-merge`; no new runtime
dependency is required by this feature.

**Storage**: Browser `localStorage` behind a narrow storage interface. No server
database. The feature adds nothing to storage.

**Testing**: Vitest for unit and integration tests, with `jsdom` for component tests.
Playwright against the production build in real Chromium for end-to-end tests.

**Target Platform**: Modern desktop browser. The route renders client-only
(`ssr = false`) because state is browser-local.

**Project Type**: Single-user browser web application, single project, no backend service

**Performance Goals**: A stage switch completes within one second, including a stage
that triggers a data load (SC-008).

**Constraints**:

- The saved screen definition format MUST NOT change, so existing apps and the
  existing test suite remain valid (FR-018).
- The stage indicator MUST NOT introduce a component type, an API function or a
  rendering technology, so registry-driven extensibility keeps working (FR-017).
- Exactly one control group may govern what is displayed (FR-006).
- Navigation state MUST remain editor state and MUST NOT enter the screen definition.

**Scale/Scope**: Three fixed stages. Affected surface: 4 component types, 3 API
functions, 3 technology stacks, one composer state class, two UI components, and the
toolbar. Baseline is 261 unit and integration tests and 21 end-to-end tests, of which
**10 end-to-end tests reference controls this feature replaces**.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Gate I — Architecture Principles: PASS**

| Rule | Status | Evidence |
| --- | --- | --- |
| 1. Registry-driven, no component-type literals in the editor | PASS | Stages are not component types. FR-017 forbids introducing one. The existing guard `src/lib/registry/extensibility.test.ts` scans composer sources and MUST continue to pass. |
| 2. UI definition is the single source of truth | PASS | Active stage is editor state. `activeStage` and `layoutPresentation` MUST be held in the composer state class and MUST NOT be written into the screen definition, per the spec's Assumptions. |
| 3. Layered boundaries via explicit typed interfaces | PASS | The stage model is a typed descriptor consumed by the roadmap, the toolbar and the composer shell. No new cross-layer coupling; the feature touches only the composer layer. |
| 4. Typed extension points, not `unknown` | PASS | The stage list is a typed descriptor array with a literal union, not a string array or `unknown`. |

**Gate II — Type and Data Safety: PASS**

Rule 5 applies; no `as any`, no `@ts-ignore`. Rules 6 and 7 are not touched by this
feature and MUST NOT regress. Rule 7's known open gap in the repository is unrelated to
this feature and is recorded, not fixed here.

**Gate III — Testing Standards: PASS**

Rule 8 requires unit, integration and end-to-end coverage; all three are planned in
`quickstart.md`. Rule 9's definition of done is the verification gate. Rule 10 requires
that any new guard be proven to fail when violated; the planned single-navigation-group
guard is covered by that requirement in `research.md` R7. Rule 11 applies to any defect
found during implementation.

**Gate IV — Delivery Discipline: PASS**

Rule 12: the feature is a single vertical slice. Rule 13: scope is bounded to
navigation, and the three exclusions that keep it disjoint from specs 001 and 002 are
recorded in the spec. Rule 14: one milestone per commit, each independently green.
Rule 15: the blast radius on existing end-to-end tests is stated explicitly below rather
than discovered during implementation.

**Gate — Governance: PASS**

Rule 17 is satisfied: this plan introduces no conflict with the constitution. No
complexity violations require justification, so the Complexity Tracking table is empty.

**Post-design re-check**: see the final section of this file.

## Project Structure

### Documentation (this feature)

```text
specs/003-workflow-roadmap/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── stage-navigation.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/lib/composer/
├── stages.ts                          # NEW: typed stage model + ordered descriptor list
├── Composer.svelte                    # MODIFIED: render roadmap; single stage -> workspace switch
├── Toolbar.svelte                     # MODIFIED: remove replaced toggles; accept roadmap props
├── state/composer-state.svelte.ts     # MODIFIED: activeStage + layoutPresentation replace mode/view
└── workflow/
    └── WorkflowRoadmap.svelte         # NEW: the three-stage indicator

src/lib/registry/extensibility.test.ts # MUST keep passing; may gain a navigation guard

e2e/composer.spec.ts                   # MODIFIED: 10 tests reference replaced controls
```

**Structure Decision**: The existing single-project layout under `src/lib` is retained.
The feature adds one new module for the stage model and one new component for the
roadmap, both inside the existing composer layer. No new top-level directory, no second
project, and no backend is introduced, because the composer layer is already the correct
boundary for editor navigation state.

## Phase 0 Research

See `research.md`. Seven decisions are recorded, covering state ownership, the shape of
the stage model, preservation of the layout presentations, accessibility of the
indicator, browser history behaviour, migration of the affected end-to-end tests, and
the new architectural guard.

## Phase 1 Design

- `data-model.md` defines Stage, ActiveStage, LayoutPresentation and AuthoringWorkflow,
  with the state transitions between them.
- `contracts/stage-navigation.md` defines the typed interface the roadmap, the toolbar
  and the composer shell share, plus the behavioural guarantee that the highlighted
  stage always agrees with the content shown.
- `quickstart.md` gives the runnable validation scenarios that prove the feature works
  end to end.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. The constitution check passed with no unjustified deviation, so this
table is intentionally empty.

---

## Post-Design Constitution Re-check

Re-evaluated after Phase 1, as the gate requires.

| Principle | Re-check result | Basis |
| --- | --- | --- |
| I. Architecture Principles | PASS | `data-model.md` defines stages as typed data in one module rather than scattered conditionals (R2). `ActiveStage` and `LayoutPresentation` are held in the composer state class and are explicitly excluded from the screen definition, honouring rule 2 (R1). No component type, API function or renderer is introduced, so rule 1's existing guard and FR-017 continue to hold. |
| II. Type and Data Safety | PASS | `StageId` is a literal union rather than a bare string, satisfying rule 4's typed extension points and rule 5's strictness. The feature writes nothing into `JsonObject`, so rule 6 is untouched. Rule 7's pre-existing gap is recorded as out of scope rather than silently fixed. |
| III. Testing Standards | PASS | `quickstart.md` Scenarios 1 to 9 cover rule 8's unit, integration and end-to-end requirement, and Scenario 9 states rule 9's definition of done. The new guard in R7 carries rule 10's obligation to prove failure by injection before acceptance. |
| IV. Delivery Discipline | PASS | One vertical slice in a single milestone (rule 12). Scope excludes the two sibling specifications (rule 13). The 10 affected end-to-end tests are stated up front rather than discovered later (rules 14 and 15). The Risks table exists to satisfy rule 15. |
| Governance | PASS | No plan decision contradicts the constitution, so rule 17 is satisfied and there is no deviation to declare. |

**Result**: gate passed before research and again after design. No violations, no
complexity justifications required, and no unresolved clarifications.

## Risks Carried Into Implementation

These are recorded because rule 15 requires known consequences to be stated rather than
discovered later.

| Risk | Detail | Mitigation |
| --- | --- | --- |
| Existing end-to-end tests break | 10 of 21 end-to-end tests reference `preview-toggle`, `view-compose`, `view-binding` or the Visual/JSON tabs, all of which are replaced | Update them in the same milestone as the consolidation, never as a follow-up. Listed in `quickstart.md`. |
| Layout presentation lost | Removing the Visual/JSON tabs would delete delivered capability | FR-009 and FR-010 preserve it as a choice inside the layout stage; `layoutPresentation` state survives stage changes. |
| Scattered stage conditionals | Branching on stage in several components would recreate the current three-axis problem | Single stage-to-content mapping owned by the composer shell; the roadmap renders no content. |
| A new guard that cannot fail | A guard added without proving failure is worse than none | Rule 10 applies; `research.md` R7 requires injecting a violation to confirm failure. |