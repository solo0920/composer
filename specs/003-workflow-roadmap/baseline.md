# Baseline: Workflow Roadmap

**Feature**: `specs/003-workflow-roadmap` | **Captured**: 2026-10-04

Pre-change state, recorded so that any later failure is attributable to this feature
rather than pre-existing.

## Automated checks

| Check | Command | Result |
| --- | --- | --- |
| Type check | `npm run check` | 0 errors, 0 warnings |
| Unit and integration tests | `npm run test` | 16 files, 261 tests passing |
| Production build | `npm run build` | succeeds |
| End-to-end tests | `npm run test:e2e` | 21 tests passing |

## Consequences to protect

These must still hold when the feature is complete. A drop in any of them is a
regression, not an acceptable side effect.

1. **261 unit and integration tests** must still pass, and **no previously passing test
   may be removed or relaxed.**
2. **21 end-to-end tests** must still pass. Ten of them reference controls this feature
   replaces; they are migrated in place, not deleted.
3. Type checking must stay at **zero errors and zero warnings**.
4. The saved screen definition format must not change, so existing apps keep loading
   unchanged (spec FR-018).

## Environment notes

- Chromium for end-to-end tests is installed and its shared libraries are provided by
  `./scripts/setup-e2e.sh` into `.playwright-libs/`, which `playwright.config.ts` adds
  to `LD_LIBRARY_PATH` automatically.
- The route renders client-only (`ssr = false`) because composer state is browser-local.