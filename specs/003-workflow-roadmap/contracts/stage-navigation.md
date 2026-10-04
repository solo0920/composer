# Contract: Stage Navigation

**Feature**: `specs/003-workflow-roadmap` | **Date**: 2026-10-04

The application exposes no external network interface for this feature. This contract
covers the **internal UI contract** that the roadmap, the toolbar and the composer
shell must agree on, because a disagreement between the highlighted stage and the
content shown is the specific defect this feature exists to prevent.

Consumers of this contract: the roadmap indicator, the existing toolbar, and the
composer shell that decides what to render.

---

## 1. Typed stage model

The stage set is declared once, as typed data. It is never re-declared per component.

```ts
type StageId = 'binding' | 'layout' | 'preview';

type Stage = {
  id: StageId;
  label: string;
  order: number;
};
```

Guarantees:

- Exactly three stages, ordered `binding` (1), `layout` (2), `preview` (3).
- `id` is a literal union. A bare `string` is a contract violation.
- The list is the only source of the stage set and of its ordering.

---

## 2. Navigation state

```ts
type NavigationState = {
  activeStage: StageId;                              // exactly one, default 'layout'
  layoutPresentation: 'visual' | 'json';              // layout stage only, default 'visual'
};
```

Guarantees:

1. `activeStage` is always a member of the declared stage list.
2. `layoutPresentation` changes only in response to an explicit user choice inside the
   layout stage. No stage change may alter it.
3. Neither field is ever written into the saved screen definition.
4. Both fields are observable and settable from outside the component that renders the
   indicator, so the indicator holds no authority of its own.

---

## 3. Behavioural contract: indicator and content always agree

This is the contract's central guarantee, restating FR-003.

> At every observable moment, exactly one stage is marked active, and the workspace
> below the indicator renders that stage's content.

Consequences, each independently testable:

| Condition | Required behaviour |
| --- | --- |
| Initial load | Exactly one stage marked; workspace matches it |
| Stage selected | Selection applied and workspace updated in the same transition |
| Already-active stage selected | No state change; nothing breaks |
| Stage change with unsaved edits | Edits preserved; unsaved indicator still accurate |
| Stage change while data loading | No loading or error residue on the abandoned stage |
| No app open | A valid stage remains marked; workspace explains that no app is open |
| App with no bindings, preview selected | Rendered view shown; explains nothing is bound |

---

## 4. Indicator contract

The roadmap indicator is presentational. It renders the stage list and reports the
active stage. It MUST NOT decide what content to show.

Guarantees:

- Renders every stage in `order`, always, at every window width.
- Marks exactly one stage as active, using a mechanism that does not rely on colour
  alone.
- Is reachable and operable without a pointer.
- Appears above the existing toolbar controls.
- Contains no completion, progress or ordering-gate behaviour.

---

## 5. Replacement contract

The stage model **replaces** three previously independent control groups:

| Removed control | Replaced by |
| --- | --- |
| `Compose` / `Binding` | The `binding` and `layout` stages |
| `Edit` / `Preview` | The `layout` and `preview` stages |
| `Visual` / `JSON` | `layoutPresentation`, retained inside the layout stage |

Guarantee: after this feature, exactly one control group governs what is displayed.
A second, overlapping control group is a contract violation and is guarded against by
the source check described in `research.md` R7.

---

## 6. Compatibility guarantee

- The saved screen definition format is unchanged. Existing apps load without
  conversion (FR-018).
- No component type, API function or technology stack is introduced by this feature
  (FR-017), so registry-driven extensibility and its existing guard are unaffected.
- Capability that the replaced controls provided — in particular both layout
  presentations — is preserved, not removed (FR-009, FR-010).