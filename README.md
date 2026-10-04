# UI Definition Composer

A working end-to-end UI platform slice: build a UI definition visually, nest
components like a JSON spec, bind them to backend API functions declaratively,
choose the technology stack behind each step of an end-to-end flow, and see real
HTTP data render live.

```text
Component Registry ─┐
Stack Registry ─────┼─> UI Definition ─> Composer ─> Binding Editor ─> API Registry
                   │          │                              │
                   └─> Flows ─┴──────────── Live Preview <───┴── Mock Backend
```

The rule that shapes the codebase: **the Composer never knows what a component,
an API or a stack is called.** It asks the registries. Adding one is a data
change, not a code change.

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
npm run verify       # svelte-check + vitest (261 tests) + production build
npm run test:e2e     # 21 Playwright tests against the built app
```

`test:e2e` needs Chromium once:

```bash
npx playwright install chromium
./scripts/setup-e2e.sh   # only if the browser is missing system libraries
```

`setup-e2e.sh` unpacks libnspr4 / libnss3 / libasound into `.playwright-libs/`
without root, and `playwright.config.ts` puts that directory on
`LD_LIBRARY_PATH` automatically.

## What the MVP does

1. Opens on a **Customer Risk Dashboard** demo (4 components, 3 live APIs).
2. One top bar: **File** menu (new app, open app, save, save as, export app,
   settings) plus the workflow stages **1 Binding → 2 UI Layout → 3 Preview**,
   with the active stage highlighted. It is the only navigation control.
3. Left palette with **collapsible** Layout / Basic / Data groups.
4. Middle canvas composes a **nested component tree** — select a Container, then
   keep clicking the palette to add children.
5. Inspector edits props, column/span, and the API binding.
6. **Binding** panel lists each e2e flow and lets every node pick its technology
   stack from a role-filtered dropdown.
7. **Preview** stage renders the same definition with real API data.
8. The layout stage offers **Visual / JSON**; JSON edits go through the same validation.
9. Apps persist in a browser library; settings change grid width and the
   `$context` values bindings read.

## Architecture

```text
src/lib/
├── domain/                         framework-free core (no Svelte, no DOM)
│   ├── json.ts                     JsonValue
│   ├── fields.ts                   FieldDescriptor — drives every generated form
│   ├── result.ts                   Result<T> for readable failures
│   ├── components/                 ComponentDefinition
│   ├── api/                        ApiDefinition
│   ├── bindings/                   BindingDefinition + expression parsing
│   ├── flows/                      FlowDefinition, NodeRole, TechnologyStack
│   ├── apps/                       AppDocument + validation
│   └── definitions/                UIDefinition + Zod validation boundary
├── registry/
│   ├── component-definitions.ts    Container, Text, Button, DataCard
│   ├── api-definitions.ts          customer.getProfile, risk.getScore,
│   │                               portfolio.getPositions
│   ├── stack-definitions.ts        svelte-runtime, rest-http, local-storage,
│   │                               json-render, a2ui-adapter, graphql, indexed-db
│   ├── component-registry.ts       list / get / has / acceptsChildren / byCategory
│   ├── api-registry.ts             list / get / has / byCategory
│   └── stack-registry.ts           list / get / has / forRole / byCategory
├── runtime/
│   ├── renderers/*.svelte          the four Svelte components
│   ├── renderer-registry.svelte.ts type -> Svelte component
│   ├── RuntimeRenderer.svelte      definition -> registry -> component tree
│   ├── RenderNode.svelte           one node + its children, recursively
│   ├── binding-runtime.ts          mapping resolution, errors as values
│   ├── flow-runtime.ts             node -> stack status (active/unsupported)
│   ├── api-client.ts               the only place fetch() is called
│   └── preview-runtime.svelte.ts   executes bindings, holds resolved data
├── composer/
│   ├── palette/ComponentPalette    collapsible, registry-driven
│   ├── canvas/                     Canvas + CanvasNode (recursive)
│   ├── inspector/Inspector         schema-driven props + layout
│   ├── binding-editor/             BindingEditor (component -> API) + BindingPanel (flows)
│   └── Toolbar, Composer, state/
├── apps/
│   ├── workspace.svelte.ts         app lifecycle behind the File menu
│   ├── FileMenu, OpenAppDialog, AppNameDialog, SettingsDialog
│   └── app-factory.ts              ids, copies, export download
├── persistence/app-library.ts      multi-app library over Web Storage
├── server/mock-api.ts              mock handlers, reached only via HTTP
└── demo/                           the demo definition and its flows

src/routes/
├── +page.svelte                    wiring, client-only (ssr = false)
└── api/mock/**/+server.ts          three real HTTP endpoints
```

### Boundaries

| Rule | Enforced in |
| --- | --- |
| Components never call APIs | `binding-runtime.ts` is the only caller of the API client |
| Composer is registry-driven | `ComponentPalette`, `BindingEditor`, `BindingPanel` read only registries |
| Composer branches on no type literal | `registry/extensibility.test.ts` fails the build if it does |
| No second copy of the definition | Composer and Preview both render `workspace.composer.definition` |
| UI state is not domain data | `selectedComponentId`, `activeStage`, `layoutPresentation`, `dirty` live in `ComposerState` |
| Navigation is not duplicated | `registry/extensibility.test.ts` fails if a replaced toggle id or a second stage renderer reappears |
| External data is validated | `validateUIDefinition` / `validateFlows` / `parseAppDocument` gate storage, JSON and export |
| Untrusted trees cannot overflow | `walkComponents` is iterative; nesting is capped at 12 |
| Failures are readable text | `Result<T>`, `ApiCallError`, `Unknown component: X` |

### Three registries, not one

| Registry | Describes | Example |
| --- | --- | --- |
| Component | things that render | `text`, `data-card` |
| API | HTTP endpoints | `customer.getProfile` |
| Stack | how a step is implemented | `svelte-runtime`, `rest-http` |

A `BindingDefinition` relates a component to an API. A `FlowNode` relates a step
of a journey to a stack. Neither registry leaks into the others' responsibilities.

### Only stacks that run are marked `implemented`

`json-render`, `a2ui-adapter`, `graphql` and `indexed-db` are declared so the
dropdowns are honest about the roadmap, and each carries `implemented: false`.
Selecting one produces a visible warning in the Binding panel and in
`resolveFlowStatus` — the app never pretends an unimplemented stack is running.
Only `svelte-runtime`, `rest-http` and `local-storage` actually execute.

## Tests

```text
E2E          21   critical flows in real Chromium (compose, bind, stack, preview,
                 save, export, reload)
Integration   2   renderer -> component tree (jsdom); API -> HTTP -> binding -> UI
                 data over a real socket
Unit        259   domain, three registries, flows, app library, workspace,
                 composer state, persistence
```

Two tests are deliberately adversarial rather than confirming:

- `registry/extensibility.test.ts` greps Composer sources for component-type
  literals and fails if one appears. It also fails if a replaced navigation
  control id reappears, if a second component renders the workflow stages, or
  if the presentation control moves back into the header. Each of those guards
  was verified to fail when a violation is injected.
- The API integration test boots a real Node HTTP server serving the same
  handlers as the SvelteKit routes, so `fetch`, status codes and JSON parsing
  are genuinely exercised.

## Mock backend

`customerId` is the only input. `CUST-1001` and `CUST-1002` exist; anything else
returns 404 and a missing parameter returns 400. Both surface next to the failing
card in the Preview.

```text
GET /api/mock/customer/profile?customerId=CUST-1001
GET /api/mock/risk/score?customerId=CUST-1001
GET /api/mock/portfolio/positions?customerId=CUST-1001
```

## Known MVP limits

Deliberate, not oversights:

- `$context` values are edited in Settings; there is no expression editor.
- Components nest arbitrarily deep, but a Container has no slot targeting — a
  child is placed by column/span, not "into the header".
- Adding inside a container keeps the container selected, so repeated palette
  clicks add siblings; select a child to descend further.
- Every grid level uses the same column count; no responsive breakpoints.
- The Button component has no event handling, and there is no undo/redo.
- Export writes JSON only. Importing an exported file is not wired up yet.
- Every page load logs one `404` for `/favicon.ico`; `static/` ships only
  `robots.txt`. Cosmetic, found while investigating an e2e flake, and left
  alone here because it belongs to no milestone in this feature.
- The stage is not written to browser history. The app has no router, so back
  and forward are no-ops for navigation; a stage deliberately reached by the
  user stays put.

## Future Work

Not built, and deliberately out of scope for this slice:

- Implement the declared stacks: json-render and A2UI adapters, a GraphQL
  transport, an IndexedDB persistence backend
- Import an exported `.uidc.json` back into the library
- Drag-and-drop placement and slot targeting for containers
- Undo/redo history, responsive breakpoints, event bindings
- Non-grid layouts
- Design-token ingestion (e.g. Penpot) into the Component Registry
- Multi-user editing, permissions, workflow engine, AI agent generation