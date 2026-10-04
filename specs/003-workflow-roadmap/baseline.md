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
---

# Verification record: quickstart scenarios

**Feature**: `specs/003-workflow-roadmap` | **Verified**: 2026-10-04

Each scenario in `quickstart.md` was checked against the running application. The
"Evidence" column names what was actually inspected, not an intention.

| # | Scenario | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Three stages present, exactly one active | PASS | Three stages render in order; `layout` alone carries `aria-current="step"`; the canvas is the content shown. Covered by the `opens on the UI Layout stage` e2e test and the first-paint integration test. |
| 2 | Selecting a stage navigates and re-marks | PASS | The `goToStage` helper used by every e2e test asserts the new stage becomes marked; reselecting Preview leaves the stage marked and the definition untouched. |
| 3 | Layout presentations survive a stage change | PASS | `the structured view survives leaving and re-entering the layout stage` (e2e) and the round-trip integration test both re-enter after visiting every other stage. |
| 4 | Indicator agrees with content on every stage | PASS | Each e2e test that changes stage asserts both the mark and the content. The no-app case was found disagreeing here and fixed; see US5 in the commit log. |
| 5 | Empty and error states are usable | PASS | `explains that no app is open without switching the marked stage`, `explains that nothing is bound without hiding the rendered view`, and the pre-existing `shows a readable binding error when the API request fails`. |
| 6 | One control group governs what is displayed | PASS | Three guards in `registry/extensibility.test.ts`, each proven to fail by injection (see T037). No removed control id remains in any composer source. |
| 7 | Keyboard operation and non-colour active state | PASS | `every stage is reachable and operable by keyboard alone` (e2e) tabs through all three stages and activates with Enter and Space. Proven to fail with `tabindex="-1"` injected. |
| 8 | No regression to the rest of the composer | PASS | All 279 pre-existing test names are still present; see the count below. Nested components, palette categories, app library and export tests all still pass. |
| 9 | Automated suite | PASS | Recorded below. |

## FR-018: the saved definition format

Verified two ways, because "no change" is a claim about code as well as runtime.

1. **Structural.** `git diff b349491 HEAD -- src/lib/persistence src/lib/domain` is
   empty. Neither the writer nor the validators have been touched by this feature.
2. **Runtime.** The e2e test `a definition saved before this feature loads and
   previews unchanged` seeds the store with a hand-written literal document in the
   pre-feature format, bypassing the app entirely, and asserts it opens, composes,
   resolves its binding to live data, and still has its flows. Proven to fail when
   the persisted field name was renamed.

## Definition of done

| Check | Command | Baseline | Final |
| --- | --- | --- | --- |
| Type check | `npm run check` | 0 errors, 0 warnings | 0 errors, 0 warnings |
| Unit and integration | `npm run test` | 16 files, 261 tests | 19 files, 323 tests |
| Production build | `npm run build` | succeeds | succeeds |
| End-to-end | `npm run test:e2e` | 21 tests | 30 tests |

No pre-existing test was removed or renamed: every one of the 279 test names present
at `b349491` is still present, and the count rose to 350.

## Defects found and fixed during verification

| Defect | Cause | Fix |
| --- | --- | --- |
| Preview stage with no app open rendered the canvas | The branch was guarded by `preview && hasApp`, so a false guard fell through to the layout workspace and contradicted the marked stage | The no-app state renders its own explanation; the indicator keeps the requested stage |
| E2E readiness gate failed roughly one run in four | Playwright defaults to 16 workers on this 32-core host; at that concurrency the composer takes ~6.0-6.5s to become interactive, overrunning the 5s default. The application was not slow | `expect.timeout` raised to 15s at the **top level** of the config. Under `use` it is silently ignored in Playwright 1.63, which is why the first attempt appeared to do nothing |
| Settings e2e failed intermittently | Two dialogs opened back to back without settling on visibility between them | Await dialog visibility before interacting and hidden after applying |
| `/favicon.ico` 404s on every page load | `static/` ships only `robots.txt` | **Not fixed here.** Cosmetic, belongs to no milestone in this feature, recorded under README Known MVP limits |

## Known limits of this verification

- The quickstart scenarios were verified through the automated suite and by
  inspecting the built application, not by a human reading each screen. Scenario 8's
  "previously existing behaviours" rests on the pre-existing tests continuing to pass.
- FR-018 was checked against one hand-written legacy document, not a corpus of every
  definition this application has ever written.
