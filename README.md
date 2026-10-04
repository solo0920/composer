# UI Definition Composer

A working end-to-end vertical slice of a runtime UI platform: build a UI
definition visually, bind components to backend API functions declaratively, and
see real HTTP data render live.

```text
Component Registry ─┐
                   ├─> UI Definition ─> Composer ─> Binding Editor ─> API Registry
Runtime Renderer <─┘         │                                          │
                             └──────────── Live Preview <── Mock Backend <-┘
```

The one rule that shapes the codebase: **the Composer never knows what a
component or an API is called.** It asks the registries. Adding a component or
an API is a data change, not a code change.

## Stack

SvelteKit 3 · Svelte 5 (runes) · TypeScript (strict) · Tailwind v4 ·
shadcn-svelte · Zod · Vitest · Playwright

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

Verify everything:

```bash
npm run verify       # svelte-check + vitest (129 tests) + production build
npm run test:e2e     # 7 Playwright tests against the built app
```

## What the MVP does

1. Open the Composer — a **Customer Risk Dashboard** demo loads.
2. Add components from the left palette (registry-driven, click-to-add).
3. Select a component, edit props, change column/span in the Inspector.
4. Bind it to an API through a searchable, grouped Combobox.
5. Set input/output mappings (`$context.customerId` -> `$.name`).
6. Toggle **Edit / Preview** and see real API data render.
7. **Save / Load / Reset** against `localStorage`, validated on the way in.
8. Switch to the **JSON** tab to read the definition, and apply a valid edit back.

## Architecture

```text
src/lib/
├── domain/                      framework-free core (no Svelte, no DOM)
│   ├── json.ts                  JsonValue
│   ├── fields.ts                FieldDescriptor — drives every generated form
│   ├── result.ts                Result<T> for readable failures
│   ├── components/              ComponentDefinition
│   ├── api/                     ApiDefinition
│   ├── bindings/                BindingDefinition + expression parsing
│   └── definitions/             UIDefinition + Zod validation boundary
├── registry/
│   ├── component-definitions.ts  Container, Text, Button, DataCard
│   ├── api-definitions.ts        customer.getProfile, risk.getScore,
│   │                             portfolio.getPositions
│   ├── component-registry.ts     list / get / has / listByCategory
│   └── api-registry.ts           list / get / has / listByCategory
├── runtime/
│   ├── renderers/*.svelte        the four Svelte components
│   ├── renderer-registry.svelte.ts   type -> Svelte component
│   ├── RuntimeRenderer.svelte    UIDefinition -> registry -> component
│   ├── binding-runtime.ts        mapping resolution + error-as-value
│   ├── api-client.ts             the only place fetch() is called
│   └── preview-runtime.svelte.ts executes bindings, holds resolved data
├── composer/                    palette, canvas, inspector, binding editor
├── persistence/definition-store.ts
├── server/mock-api.ts           mock handlers, reached only via HTTP
└── demo/customer-risk-dashboard.ts

src/routes/
├── +page.svelte                 wiring, persistence, preview refresh
└── api/mock/**/+server.ts       three real HTTP endpoints
```

### Boundaries

| Rule | Where it is enforced |
| --- | --- |
| Components never call APIs | `binding-runtime.ts` is the only caller of the API client |
| Composer is registry-driven | `ComponentPalette.svelte` / `BindingEditor.svelte` read only from registries |
| No second copy of the definition | Composer and Preview both render `state.definition` |
| UI state is not domain data | `selectedComponentId`, `mode`, `view`, `dirty` live in `ComposerState` only |
| External data is validated | `validateUIDefinition` gates `localStorage` and the JSON editor |
| Failures are readable text | `Result<T>`, `ApiCallError`, `Unknown component: X` |

### Why the registries stay separate

`ComponentRegistry` describes things that render. `ApiRegistry` describes HTTP
endpoints. A `BindingDefinition` is the only artifact that relates the two, so
neither registry can drift into the other's responsibilities.

### Why metadata lives apart from renderers

`registry/component-definitions.ts` is the single source of component metadata —
the palette, the Inspector form and validation all read it.
`runtime/renderer-registry.svelte.ts` only attaches `type -> Svelte component`.
Adding a component is therefore one metadata entry plus one renderer, and no
Composer code changes.

## Tests

```text
E2E          7   critical flow in a real browser (add, bind, preview, save, reload)
Integration  2   renderer -> component (jsdom); API -> HTTP -> binding -> UI data (real socket)
Unit       120   domain, registries, bindings, API client, persistence, composer state
```

The API integration test boots a real Node HTTP server that serves the same
handlers as the SvelteKit routes, so `fetch` semantics, status codes and JSON
parsing are genuinely exercised.

`e2e/` needs a Chromium download once: `npx playwright install chromium`.

## Mock backend

`customerId` is the only input. `CUST-1001` and `CUST-1002` exist; anything else
returns 404, and a missing parameter returns 400. Both surface in the Preview as
a readable message next to the failing card.

```text
GET /api/mock/customer/profile?customerId=CUST-1001
GET /api/mock/risk/score?customerId=CUST-1001
GET /api/mock/portfolio/positions?customerId=CUST-1001
```

## Known MVP limits

These are deliberate, not oversights:

- `$context` is a fixed constant (`PREVIEW_CONTEXT`); there is no context editor.
- The JSON tab is read-oriented by default. `Apply JSON` already routes edits
  through the same validation as storage, so two-way sync needs no new plumbing.
- Column/span are edited in the Inspector; there is no drag or resize.
- Components are a flat list. `Container` renders a framed region but the
  definition has no nesting, so it cannot hold children yet.
- The Button component has no event handling.
- Layout is a single fixed 12-column grid, with no responsive breakpoint.

## Future Work

Not built, deliberately out of scope for this slice:

- Context editor and request/response inspector for bindings
- Drag-and-drop placement on the canvas
- Undo/redo history
- A second persistence backend (the `DefinitionStorage` interface already allows one)
- Non-grid layouts and responsive breakpoints
- Extra renderers for the same definition IR: A2UI, json-render, React
- Design-token ingestion (e.g. Penpot) into the Component Registry
- Event bindings on components