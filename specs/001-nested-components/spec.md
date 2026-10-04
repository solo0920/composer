# Feature Specification: Nested Components

**Feature Branch**: `001-nested-components`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "Nested components (Container can hold child components)"

> **Baseline correction (verified 2026-10-04 against the code).** The feature request
> describes the screen definition as "a flat list of components" in which "Container
> only draws a frame and cannot hold other components". That is no longer true. The
> following is already implemented, tested and shipped, and MUST NOT be rebuilt:
>
> - A component instance already carries a nested `children` list.
> - Components already declare whether they accept children, and validation rejects
>   children on components that do not.
> - The runtime renderer and the editing canvas already render and select the tree
>   recursively, to three or more levels.
> - Insertion already targets the selected container, with a visible hint showing
>   where the next component will land.
> - Saving and reloading already preserves hierarchy and order; existing flat
>   definitions load unchanged.
> - Ninety percent of the stated acceptance criteria are already met.
>
> What does **not** exist yet, and is the real content of this feature, is direct
> manipulation: dragging a component from the palette into a container, reordering
> siblings, moving a component between containers or back to the top level, and
> warning the user before a container's children are destroyed. This specification
> is scoped to that delta.

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

### User Story 1 - Drag a component into a container (Priority: P1)

As an editor, I can drag a component from the palette onto a container so that it
becomes that container's child, rather than clicking a button and having the
placement inferred for me. I want to see where the component will land before I
release it.

**Why this priority**: Direct placement is the whole point of grouping components.
Every other story refines a tree that this story creates, so nothing else is usable
without it.

**Independent Test**: Drag one component from the palette onto an empty container
and verify it renders as that container's child, in both the editing view and the
live preview. Delivers grouping without touching anything else.

**Acceptance Scenarios**:

1. **Given** an empty container on the canvas, **When** the user drags a palette
   component over it, **Then** the container shows an insertion affordance
   indicating the drop is allowed.
2. **Given** an insertion affordance is showing, **When** the user releases, **Then**
   the component becomes a child of that container and is placed at the end of its
   existing children.
3. **Given** a component that does not accept children, **When** the user drags a
   palette component over it, **Then** the drop is refused and the component shows a
   refusal state rather than silently doing nothing.
4. **Given** a container with existing children, **When** the user drags a component
   over a specific child, **Then** the system indicates the position the new
   component would take relative to that child.
5. **Given** the pointer is over an area outside any container, **When** the user
   releases, **Then** nothing is added and no error is raised.

---

### User Story 2 - Reorder siblings (Priority: P2)

As an editor, I can change the order of children within one container so that the
reading order of my layout matches my intent, without deleting and rebuilding.

**Why this priority**: Order is part of the layout's meaning. It depends on P1 but
is separable from it.

**Independent Test**: With a container holding three children, move the last one to
the front and verify the rendered order changes accordingly and survives a reload.

**Acceptance Scenarios**:

1. **Given** a container with three or more children, **When** the user moves one
   child's position, **Then** all siblings shift and the visual order matches the new
   sequence.
2. **Given** a reordered set of children, **When** the user saves and reloads, **Then**
   the order is exactly as it was before saving.
3. **Given** a container, **When** the user requests its children to be reversed or
   reset to insertion order, **Then** the operation is applied consistently.

---

### User Story 3 - Move a component to a different parent (Priority: P2)

As an editor, I can move an existing component from one container to another, or
back to the top level, so that I can restructure without recreating the component
and losing its content or its data binding.

**Why this priority**: Restructuring is a routine correction; forcing a rebuild is
punishing when the component carries a binding. Shares priority with P2 because both
are ordering operations over an existing tree.

**Independent Test**: Move a bound component from one container into another and
verify its properties, its binding and its resolved data are unchanged.

**Acceptance Scenarios**:

1. **Given** a component with properties and a data binding, **When** the user moves
   it to another container, **Then** its properties, its binding and the data it
   displays are unchanged.
2. **Given** a nested component, **When** the user moves it to the top level, **Then**
   it becomes a top-level component and remains fully editable.
3. **Given** a container is being targeted as a new parent, **When** that container
   does not accept children, **Then** the move is refused with a clear reason.
4. **Given** a top-level component, **When** the user attempts to move it upward, **Then**
   the system reports that it is already at the top level rather than failing silently.

---

### User Story 4 - Be warned before a container's children are destroyed (Priority: P3)

As an editor, when I delete a container that has children, I am told how many will be
deleted along with it, and I can cancel. I do not want to lose a section of my layout
to one mis-click.

**Why this priority**: It prevents data loss rather than adding capability, and it is
cheap. Last because the destructive behaviour already works correctly; only the
warning is missing.

**Independent Test**: Delete a container holding two children, cancel at the
confirmation, and verify the tree is untouched; then confirm and verify all three
components are gone.

**Acceptance Scenarios**:

1. **Given** a container with two or more descendants, **When** the user deletes it,
   **Then** the system states how many components will also be removed and asks for
   confirmation.
2. **Given** the confirmation is showing, **When** the user cancels, **Then** the tree
   is completely unchanged, including selection.
3. **Given** a container with no children, **When** the user deletes it, **Then** no
   confirmation is shown, because nothing else is lost.
4. **Given** a deletion is confirmed, **When** the user inspects the result, **Then**
   no orphaned component remains anywhere in the tree.

---

### User Story 5 - Hierarchy stays consistent everywhere (Priority: P1)

As a user, the hierarchy I see in the live preview is exactly the hierarchy I built
in the editor, and each component's data binding keeps working no matter how deeply it
is nested. What I save is exactly what I get back.

**Why this priority**: This is the promise that makes hierarchy trustworthy. Most of
it already holds and must not regress; it is P1 because a hierarchy feature that
renders or persists inconsistently is worthless.

**Independent Test**: Build three levels, preview, save, reload, and confirm the
structure, the order and the displayed data are identical, and that a bound component
at the deepest level still shows data.

**Acceptance Scenarios**:

1. **Given** a three-level structure, **When** the user switches to the live preview,
   **Then** the nesting depth and order are identical to the editing view.
2. **Given** a component bound to a data source at any depth, **When** the preview
   loads, **Then** its data resolves and is displayed.
3. **Given** a tree with an unsaved change, **When** the user saves then reloads, **Then**
   the definition is byte-for-byte equivalent in structure, order, properties and
   bindings.
4. **Given** a definition saved before hierarchy existed, **When** the user opens it,
   **Then** it loads and previews exactly as before, with no conversion step.

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- A container is dragged onto itself or onto one of its own descendants. The drop
  MUST be refused, because accepting it would make a component its own ancestor.
- A container holding a large subtree is deleted. The confirmation MUST state the
  total number of components affected, counting all descendants, not just direct
  children.
- An empty container is displayed. It MUST be visually distinguishable from a
  populated one and MUST show where a dragged component would land.
- Nesting reaches the depth limit. The limit MUST be enforced on drop with a visible
  explanation, and the canvas MUST remain responsive at that depth.
- A component is moved between containers. Its properties, binding and resolved data
  MUST be identical afterwards.
- A definition is loaded that contains an invalid hierarchy, such as a child
  referencing a parent that does not exist, or a self-referencing component. The
  system MUST report a specific, readable error and MUST NOT crash or silently
  discard content.
- A drag is abandoned part-way, for example the pointer leaves the window. The canvas
  MUST return to its resting state with nothing added.
- Two containers are dropped on in quick succession. Each drop MUST be applied
  exactly once.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill it out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: The system MUST allow a user to drag a component from the palette onto
  a container that declares it accepts children, and the component MUST become a child
  of that container.
- **FR-002**: The system MUST indicate, before release, whether a drop will be
  accepted or refused, and MUST NOT rely on the drop failing silently.
- **FR-003**: The system MUST refuse a drop onto a component that does not accept
  children, and MUST refuse a drop that would make a component an ancestor of itself.
- **FR-004**: The system MUST allow a user to change the position of a child within
  its container, and the change MUST be reflected in the rendered order.
- **FR-005**: The system MUST allow a user to move a component to a different
  container or to the top level, preserving its properties, its binding and its
  identity.
- **FR-006**: The system MUST allow a user to move a component only between parents
  that accept children, and MUST explain a refusal.
- **FR-007**: Before deleting a container that has descendants, the system MUST state
  the number of components that will be removed with it and MUST require explicit
  confirmation.
- **FR-008**: When a container with no children is deleted, the system MUST NOT
  require confirmation.
- **FR-009**: A cancelled deletion MUST leave the tree and the current selection
  completely unchanged.
- **FR-010**: The system MUST render the component hierarchy to the same depth and in
  the same order in the editing view and in the live preview.
- **FR-011**: A component's data binding MUST resolve and display identically
  regardless of its depth in the hierarchy.
- **FR-012**: Saving and reloading MUST preserve hierarchy, sibling order, properties
  and bindings exactly.
- **FR-013**: Definitions saved before hierarchy existed MUST load and preview
  unchanged, without a conversion step.
- **FR-014**: Adding a new component type that accepts children MUST NOT require any
  change to the editor's code.
- **FR-015**: The system MUST enforce a documented maximum nesting depth, MUST refuse
  a drop that would exceed it, and MUST state the reason.
- **FR-016**: Loading a definition with an invalid hierarchy MUST produce a specific
  readable error and MUST NOT crash or silently drop content.
- **FR-017**: An abandoned drag MUST leave the canvas in its resting state with
  nothing added.
- **FR-018**: The existing click-to-add insertion path MUST continue to work
  alongside drag and drop.

*Example of marking unclear requirements:*

- **FR-019**: When a user deletes a container that has children, the system MUST
  [NEEDS CLARIFICATION: cascade-delete the descendants, or promote them to the deleted
  container's parent level? This determines whether a deletion is recoverable by
  changing the user's mind, and it changes the data shape written on save.]
- **FR-020**: A component's data binding MUST [NEEDS CLARIFICATION: be able to read
  values produced by its ancestors, or resolve only against the flat runtime context?
  This decides whether bindings gain a scope dimension or stay context-only.]
- **FR-021**: The maximum permitted nesting depth MUST be [NEEDS CLARIFICATION: a
  specific value, and what a user sees when they try to exceed it. A limit exists in
  the delivered code at twelve levels, but the product intent and the behaviour at the
  boundary are not confirmed.]

### Key Entities *(include if feature involves data)*

- **Component Instance**: A single placed element on the canvas. Has an identity, a
  type, properties, a placement, an optional data binding, and zero or more child
  instances. Children belong to exactly one parent.
- **Container**: A component instance whose type declares that it accepts children. Its
  descendants are ordered and are removed with it as a unit, subject to FR-019.
- **Hierarchy**: The parent-child structure formed by component instances. Depth is
  bounded by FR-021. A component MUST NOT appear within its own subtree.
- **Drop Target**: The transient state describing a pending insertion, including the
  intended parent and the intended sibling position.
- **Deletion Confirmation**: The prompt shown before a destructive delete, stating the
  number of components affected.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: An editor can build a three-level hierarchy using drag and drop alone,
  without any conversion or manual editing, in under two minutes.
- **SC-002**: In usability testing, at least 90% of editors place a component into a
  container correctly on their first attempt, with no need for a second try or a
  written instruction.
- **SC-003**: 100% of refused drops present a visible reason; zero refused drops occur
  without explanation.
- **SC-004**: Saving and reloading reproduces the hierarchy and sibling order exactly,
  verified across all automated end-to-end scenarios.
- **SC-005**: 100% of pre-existing flat definitions continue to open and preview
  correctly, with zero content changes.
- **SC-006**: Every destructive deletion of a non-empty container is preceded by a
  confirmation naming the number of components at risk; zero such deletions occur
  without it.
- **SC-007**: Moving a component between containers preserves its properties, binding
  and displayed data in 100% of cases.
- **SC-008**: No existing automated test regresses, and the hierarchy behaviour is
  covered by new unit, integration and end-to-end tests.
- **SC-009**: A canvas holding the maximum supported depth remains responsive, with
  interactions completing within one second.

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill it out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- The nested data model, recursive rendering, registry-driven child acceptance,
  hierarchy-preserving save and reload, and legacy flat-definition compatibility are
  already delivered. This feature builds on them and MUST NOT redesign them.
- Insertion currently works by selecting a container and choosing a component from
  the palette. That path remains available after this feature, as required by FR-018.
- The delivered code enforces a maximum nesting depth of twelve levels. This feature
  preserves that guard and makes the boundary visible to the user.
- Because the data model nests by containment rather than by reference, a component
  cannot be its own ancestor in stored data. The refusal in FR-003 therefore guards
  the interaction, and separately the loader MUST reject malformed hierarchies per
  FR-016.
- Drag and drop is an interaction convenience layered on top of existing tree
  operations. Every drag outcome is equivalent to an already-supported structural
  change.
- The editor is a single-user, browser-local tool. No multi-user editing, presence or
  concurrent modification concerns apply.
- Layout arrangement detail, style inheritance, cross-container binding scope rules,
  copy and paste, and undo and redo remain out of scope, as stated in the request.

## Out of Scope

- Detailed layout arrangement: grid and flex selection, alignment, spacing control.
- Style inheritance or theming.
- Cross-container data binding scope rules, beyond the clarification in FR-020.
- A runtime context editor; the delivered settings screen already edits context values.
- Duplicate, copy and paste, undo and redo.

## Dependencies

- The component registry's declaration of which types accept children, which already
  exists and is the single source of truth for FR-003 and FR-014.
- The existing tree traversal, insertion, replacement and removal operations on the
  definition, which drag, reorder and move MUST reuse rather than duplicate.
- The existing recursive renderer and canvas, which must render any resulting tree
  without modification.