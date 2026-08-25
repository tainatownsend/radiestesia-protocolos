# Fluxa root migration plan

Status: preparation only. Do **not** execute this migration before the visual/architecture PR is approved and merged.

## Goal

Promote the current Fluxa application from `/fluxa/` to the repository root so the canonical GitHub Pages URL becomes:

`https://tainatownsend.github.io/radiestesia-protocolos/`

The legacy root application should be removed. The old `/fluxa/` URL should temporarily redirect to the new root so existing bookmarks continue to work during the transition.

## Preparation already completed

The following migration risks are now protected on `main` before the move itself:

- `fluxa/index.html` and `manifest.webmanifest` are guarded to keep core asset references, manifest `id`, `start_url`, `scope`, and icons relative and relocatable.
- `offline-ui.js` is guarded to keep service-worker registration at `./service-worker.js` with scope `./` and without a hard-coded `/fluxa/` path.
- `service-worker.js` derives local URL eligibility from its runtime root instead of checking for a hard-coded `/fluxa/` pathname.
- Fluxa primary, backup, and recovery `localStorage` keys are guarded to remain path-independent so existing local data remains visible after the URL move.
- The service worker and treatment-theme discovery are guarded to remain aligned on the same legacy root protocol source set.
- A regression inventories current root/`fluxa/` filename collisions and keeps critical `index.html` / `app.js` collisions explicit before migration.
- Legacy protocol source files are guarded against accidental removal while Fluxa still depends on them.

## Remaining work for the actual migration

1. **Wait for visual/architecture approval**
   - Merge the approved Fluxa architecture/visual PR first.
   - Do not move files while the current visual validation branch is still under review.

2. **Classify root collisions deliberately**
   - The repository root already contains legacy UI files with names that collide with Fluxa runtime files.
   - Classify each collision as:
     - replaced by the Fluxa version,
     - retained as a protocol/content source,
     - renamed/moved because Fluxa imports it,
     - or deleted as obsolete legacy UI.
   - Do not bulk-delete root files before completing this classification.

3. **Move Fluxa runtime to root**
   - Move the approved Fluxa shell/runtime out of `/fluxa/` into the repository root.
   - Preserve protocol/content dependencies until their references are migrated and tested.

4. **Rewrite legacy protocol source paths together**
   - `service-worker.js` and `treatment-theme-library.js` currently resolve root protocol sources through `../...` because Fluxa lives one directory below root.
   - After promotion, update both loaders in the same migration PR so they resolve the retained protocol sources from the new root location.

5. **Bump service-worker cache generation**
   - Advance `CACHE_NAME` during root promotion so existing installs do not keep serving the old `/fluxa/` shell.
   - Verify activation removes older `fluxa-runtime-*` caches and navigation fallback resolves to the new root.

6. **Keep `/fluxa/` as a temporary redirect only**
   - Replace the old Fluxa directory runtime with a small `/fluxa/index.html` redirect to `../`.
   - The redirect must not register a service worker, write application state, or leave a second independent Fluxa runtime.

7. **Update filesystem-location tests**
   - Adjust tests that intentionally refer to the `fluxa/` directory so they validate the new root layout without weakening domain or portability guarantees.

## Safe execution sequence

1. Merge the approved architecture/visual Fluxa PR.
2. Create a dedicated migration branch from the then-current `main`.
3. Re-run the collision/source dependency inventory on that exact base.
4. Move the Fluxa runtime to root without deleting required protocol/content sources.
5. Update both legacy protocol-source loaders together.
6. Bump the service-worker cache generation.
7. Update tests that assume the old `fluxa/` filesystem location.
8. Add the temporary `/fluxa/` redirect.
9. Run every Fluxa regression test and JavaScript syntax check.
10. Smoke-test root hosting with a local HTTP server:
   - initial load,
   - open/close session,
   - Assistido selection,
   - investigation,
   - treatment creation/resume,
   - Hawkins baseline/final flow,
   - history/report access,
   - refresh while online,
   - refresh while offline after first load.
11. Validate GitHub Pages at the root URL.
12. Confirm `/fluxa/` redirects to the root and does not expose a second independent app.

## Migration acceptance criteria

- The root URL opens Fluxa, not the legacy application.
- No runtime request for a required Fluxa asset returns 404.
- Treatment/protocol discovery remains complete.
- Service-worker installation succeeds with root scope.
- Offline reload works after one successful online visit.
- Existing local Fluxa data remains readable under the same storage keys.
- `/fluxa/` redirects to the root during the compatibility period.
- The redirect does not register another service worker or maintain a second application state.
- There is only one canonical Fluxa runtime after migration.
- All automated Fluxa tests are green on the exact migration head SHA.

## Explicit non-goals before visual approval

- No Fluxa runtime files are moved to root.
- No legacy root UI files are deleted.
- No protocol source files are reorganized.
- No GitHub Pages routing is changed.
- No visual/domain/session/treatment behavior is changed by migration-preparation work.
