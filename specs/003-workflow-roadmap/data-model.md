# Phase 1 Data Model: Workflow Roadmap

**Feature**: `specs/003-workflow-roadmap` | **Date**: 2026-10-04

Source: `spec.md` entities, resolved by `research.md`.

---

## Stage

One of the three ordered steps of the authoring workflow. Fixed by specification; not
user-extensible in this version.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `StageId` | Literal union of the three ids |
| `label` | `string` | User-facing name shown in the indicator |
| `order` | `number` | Position in the workflow, ascending |

`StageId` is a literal union, never a bare `string`, per constitution rule 4.

### Stage set

| order | id | label | Content it presents |
| --- | --- | --- | --- |
| 1 | `binding` | Binding | Binding panel and the selected component's binding editor |
| 2 | `layout` | UI Layout | Palette, canvas, inspector, and the layout presentation |
| 3 | `preview` | Preview | Rendered result with each bound component's resolved data |

**Validation rules**

- The set MUST contain exactly the three ids above, in the order above.
- `order` MUST be unique and contiguous.
- Adding, removing or reordering a stage is out of scope for this version.

---

## ActiveStage

The single stage currently in effect. Transient editor state.

| Field | Type | Notes |
| --- | --- | --- |
| value | `StageId` | Exactly one active stage at any time |

**Rules**

- Exactly one stage is active at any time (FR-002).
- The active stage MUST agree with the content shown in the workspace below the
  indicator (FR-003). This is the specification's core guarantee.
- The active stage MUST NOT be persisted into the screen definition. It is editor
  state, per constitution rule 2 and the specification's Assumptions.
- Default on load and after a reload: `layout`. Rationale — the layout stage is the
  primary working surface and is the only stage with an empty-state requirement
  already satisfied for a fresh app (FR-015).

---

## LayoutPresentation

How the layout stage is shown. Belongs to the layout stage alone.

| Field | Type | Notes |
| --- | --- | --- |
| value | `'visual' \| 'json'` | Visual canvas, or structured content |

**Rules**

- MUST NOT be offered on the binding or preview stages (FR-010).
- MUST survive leaving and re-entering the layout stage (FR-009).
- Default: `visual`.
- MUST NOT be persisted into the screen definition.

---

## AuthoringWorkflow

The ordered set of stages, presented together at the top of the window.

| Field | Type | Notes |
| --- | --- | --- |
| stages | `readonly Stage[]` | Ordered, exactly three |
| active | `StageId` | Identifies which stage is highlighted |

**Rules**

- Rendered above the existing toolbar controls and present at every window width
  (FR-007).
- Contains no progress or completion state. The highlight indicates only which stage
  is current, per the specification's Assumptions.
- Stages are not gates. Any stage may be selected at any time.

---

## Relationships

```text
AuthoringWorkflow
    ├── contains 3 × Stage          (ordered, fixed)
    ├── has 1 × ActiveStage        (identifies one Stage)
    └── owns 1 × LayoutPresentation (applies to the layout stage only)
```

The three entities form a one-to-one relationship at the level of *current position*:
one workflow, one active stage. They are independent of the screen definition, the
component registry and the API registry, and MUST NOT reference them.

---

## State transitions

All transitions originate from a user selecting a stage in the indicator.

| From | Event | To | Side effects |
| --- | --- | --- | --- |
| any stage | Select `binding` | `binding` | Binding workspace shown; active stage becomes `binding` |
| any stage | Select `layout` | `layout` | Layout workspace shown; `layoutPresentation` **unchanged** |
| any stage | Select `preview` | `preview` | Rendered view shown; bound data resolves as usual |
| any stage | Select the already-active stage | unchanged | No state change; unsaved edits preserved (FR-005) |
| any stage | Stage change with unsaved edits | target stage | Edits preserved; unsaved indicator remains accurate (FR-012) |
| any stage | Stage change while data loading | target stage | No loading or error state left visible on the abandoned stage (FR-011) |

There is no transition that resets `layoutPresentation`, and no transition that writes
to storage. Both are deliberate, per FR-009 and the Assumptions.

---

## What this model deliberately does not contain

- **No progress or completion state.** The specification defines the highlight as
  indicating the current stage only.
- **No enforced order.** Stages are not gates, so no transition is rejected for
  sequence reasons.
- **No per-app or per-screen stage.** The active stage is session state.
- **No persistence.** Neither entity is written to the screen definition; FR-018
  guarantees the stored format is untouched.

This model introduces no concept that the existing screen definition does not already
have, which is why FR-018 can guarantee existing apps keep loading unchanged.