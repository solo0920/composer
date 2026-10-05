# UI Definition Composer Constitution

## Core Principles

### 1. Registry-Driven Architecture
Components, APIs, and stacks MUST be registry-driven.
Core code MUST NOT branch on concrete component type literals.

### 2. Single Source of Truth
UIDefinition MUST be the single source of truth for the rendered UI.
Composer and Renderer MUST NOT maintain competing authoritative state.

### 3. Layered Boundaries
Domain, registry, runtime, composer, and persistence MUST remain
separate through explicit typed interfaces.

### 4. Type Safety
TypeScript MUST use strict mode.
Project-authored code MUST NOT use `as any` or `@ts-ignore`.
Domain boundaries MUST validate external data.

### 5. Testable Changes
New behavior MUST include appropriate automated tests.
Architectural constraints SHOULD be enforced by tests where practical.

### 6. Vertical Slice
Prefer the smallest complete working vertical slice.
Avoid speculative infrastructure and premature abstraction.

### 7. Scope Discipline
Implement only what the approved specification requires.
Out-of-scope improvements MUST be recorded, not implemented.

### 8. Minimal and Honest Delivery
Prefer the smallest change that satisfies the specification.
Do not claim verification that was not actually performed.
A task is complete only when its acceptance criteria and required
verification pass.

## Agent Rules

Agents MUST:
- inspect existing code before changing it
- follow the approved specification and tasks
- reuse existing abstractions where appropriate
- stop when the assigned scope is complete

Agents MUST NOT:
- silently expand scope
- perform unrelated refactoring
- redesign requirements during implementation
- add speculative abstractions
- weaken or remove tests to make a change pass

## Governance

This constitution takes precedence over specifications, plans,
tasks, and agent prompts.

Changes to these principles MUST be explicit and reviewed.