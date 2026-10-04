# Quickstart: Validating the Workflow Roadmap

**Feature**: `specs/003-workflow-roadmap` | **Date**: 2026-10-04

Runnable validation scenarios proving the feature works end to end. This is a
verification guide, not an implementation guide: no component bodies, no test source,
no migrations.

---

## Prerequisites

- Node.js 22 and npm available.
- Repository dependencies installed: `npm install`.
- For end-to-end scenarios only, a Chromium build and its system libraries:
  `npx playwright install chromium` then `./scripts/setup-e2e.sh` if libraries are
  missing. The script needs no root.

---

## Baseline before starting

Record the starting point so that a regression is distinguishable from a pre-existing
failure.

```bash
npm run check     # expect: 0 errors, 0 warnings
npm run test      # expect: 13 files, 261 tests passing
npm run build     # expect: success
```

If any of these fail before you begin, stop and report it. Per the constitution, a
defect found during implementation is fixed and tested rather than worked around.

---

## Definition of done

The feature is complete only when all four hold:

1. `npm run check` reports **zero errors and zero warnings**.
2. `npm run test` passes with **no previously passing test removed or relaxed**.
3. `npm run build` succeeds.
4. `npm run test:e2e` passes and the main flow has been exercised in a real browser.

---

## Scenario 1 — Three stages are present and exactly one is active

**Covers**: FR-001, FR-002, FR-003

1. Start the app: `npm run dev`.
2. Inspect the top of the window.
3. Expect: three stages, in order — Binding, UI Layout, Preview.
4. Expect: exactly one stage visually distinct, and it is UI Layout.
5. Expect: the workspace below shows the canvas.

**Fails if**: any stage is missing or out of order, more or fewer than one stage is
marked, or the marked stage disagrees with the content below it.

---

## Scenario 2 — Selecting a stage navigates and re-marks

**Covers**: FR-004, FR-005

1. Select **Binding**.
2. Expect: binding content shown; Binding now marked; UI Layout no longer marked.
3. Select **Preview**.
4. Expect: rendered result shown, including live data; Preview now marked.
5. Select **Preview** again.
6. Expect: nothing breaks, stage stays marked, no unsaved work lost.

**Fails if**: a stage selection does not change the content, leaves two stages marked,
or resets state.

---

## Scenario 3 — Layout presentations survive a stage change

**Covers**: FR-009, FR-010

1. On **UI Layout**, switch to the structured presentation.
2. Expect: structured content shown instead of the canvas.
3. Move to **Preview**, then back to **UI Layout**.
4. Expect: the structured presentation is still selected.
5. Move to **Binding**.
6. Expect: no layout presentation control is offered there.

**Fails if**: the structured view is lost on return, or the control leaks onto another
stage. This scenario guards delivered capability that a naive consolidation deletes.

---

## Scenario 4 — Indicator agrees with content across every stage

**Covers**: FR-003 — the specification's central guarantee

For each of the three stages, in both directions, assert that the marked stage matches
the content shown. Include the round trip Binding → Layout → Preview → Layout →
Binding.

**Fails if**: any state exists where the indicator and the content disagree. This is
the defect the three replaced control groups could produce.

---

## Scenario 5 — Empty and error states are usable

**Covers**: FR-013, FR-014, FR-015

1. Create a new empty app via **File → New app**.
2. Expect: a stage is still marked, and the workspace explains no app is open or that
   the app is empty. It does not look broken.
3. Select **Preview** on an app with no bindings.
4. Expect: rendered view shown, explaining that nothing is bound.
5. Force a bound data source to fail.
6. Expect: the failure reported in place with actionable wording; the rest of the
   screen still renders.

**Fails if**: any empty or failed state renders as blank or as an unhandled error.

---

## Scenario 6 — One control group governs what is displayed

**Covers**: FR-006, and SC-004

1. Inspect the toolbar and the roadmap.
2. Expect: no leftover `Compose`/`Binding`, `Edit`/`Preview` or `Visual`/`JSON` controls
   competing with the stages.
3. Confirm the guard described in `research.md` R7 exists and that it was proven to
   fail by injecting a violation before being accepted.

**Fails if**: any second, overlapping navigation control remains.

---

## Scenario 7 — Keyboard operation and non-colour active state

**Covers**: FR-008

1. Move focus to the stage controls using only the keyboard.
2. Expect: each stage is reachable and operable.
3. Activate a stage.
4. Expect: content changes and the new active stage is perceivable without relying on
   colour alone.

**Fails if**: any stage requires a pointer, or the active state is conveyed by colour
only.

---

## Scenario 8 — No regression to the rest of the composer

**Covers**: FR-012, FR-018, SC-006, SC-007

1. Add a component, adjust its arrangement, bind it to a data function.
2. Confirm the unsaved indicator appears, survives a stage change, and clears on save.
3. Switch to Preview; confirm the bound data resolves.
4. Save, reload, and confirm the definition is unchanged by the presence of the
   roadmap.
5. Confirm previously existing behaviours still pass: nested components, palette
   categories, app library, export.

**Fails if**: any existing capability regresses, or the saved definition format
changes.

---

## Scenario 9 — Automated suite

**Covers**: Rule 8 — unit, integration and end-to-end coverage

```bash
npm run check      # 0 errors, 0 warnings
npm run test       # all unit and integration tests pass; none removed or relaxed
npm run build      # production build succeeds
npm run test:e2e   # all end-to-end tests pass in a real browser
```

**Migration note**: 10 end-to-end tests currently reference controls this feature
replaces — 7 use `preview-toggle`, 4 use `view-binding`, 2 use the Visual/JSON tabs.
They are updated **within this milestone**, not afterwards. If the suite is red after
the change, that milestone is not done.

---

## Expected artifact state on completion

```text
specs/003-workflow-roadmap/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/stage-navigation.md
└── tasks.md            # created later by /speckit.tasks
```