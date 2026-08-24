# Fluxa root migration plan

Status: preparation only. Do **not** execute this migration before the visual/architecture PR is approved and merged.

## Goal

Promote the current Fluxa application from `/fluxa/` to the repository root so the canonical GitHub Pages URL becomes:

`https://tainatownsend.github.io/radiestesia-protocolos/`

The legacy root application should be removed. The old `/fluxa/` URL should temporarily redirect to the new root so existing bookmarks continue to work during the transition.

## Current path audit

### Already relocatable

- `fluxa/index.html` loads CSS, scripts, manifest and icons with relative URLs. Moving the whole Fluxa shell to the root should keep these references valid as long as files move together.
- `fluxa/manifest.webmanifest` uses relative `id`, `start_url`, `scope` and icon paths (`./`, `icon.svg`), so the manifest itself is structurally compatible with root hosting.
- `offline-ui.js` registers `./service-worker.js` with scope `./`; after moving both files together this should naturally register at the repository-root app scope.

### Must be changed during migration

1. **Service-worker path gate**
   - `service-worker.js` currently treats a URL as part of Fluxa only when `url.pathname.includes('/fluxa/')`.
   - At root this would exclude the canonical app shell and break runtime caching/offline behavior.
   - Replace the hard-coded subdirectory check with a scope/root-relative check derived from the service worker location.

2. **Legacy protocol sources from Fluxa modules**
   - `service-worker.js` currently resolves root protocol sources with `../app.js`, `../marriage.js`, `../deep-tree.js`, `../deep-tree-2.js` and the `../protocols-v11-*.js` files because Fluxa lives one directory below the repository root.
   - `treatment-theme-library.js` uses the same `../...` source layout.
   - Once Fluxa is moved to the root these references must become root-local references (for example `./app.js`) **only if those legacy protocol source files remain at root**. If they are also reorganized, update both loaders together.

3. **Name collisions with the legacy root app**
   - The repository root already contains legacy files with names such as `index.html`, `app.js`, styles and protocol assets.
   - Migration must explicitly classify each root file as:
     - replaced by the Fluxa version,
     - retained as a protocol/content source,
     - renamed/moved because Fluxa imports it,
     - or deleted as obsolete legacy UI.
   - Do not bulk-delete root files before completing this dependency classification.

4. **Service-worker cache version**
   - Bump `CACHE_NAME` during the root promotion so installations do not keep serving the old `/fluxa/` shell from a previous cache.
   - Verify that activation removes older `fluxa-runtime-*` caches and that navigation fallback resolves to the new root.

5. **Old `/fluxa/` URL**
   - After the root app is validated, keep a temporary `/fluxa/index.html` redirect to `../` rather than leaving a second copy of Fluxa.
   - The redirect must not register its own service worker or maintain a second application state.

## Safe execution sequence

1. Merge the approved architecture/visual Fluxa PR first.
2. Create a dedicated migration branch from the then-current `main`.
3. Inventory root files and Fluxa files, including collisions and imports.
4. Move the Fluxa runtime to root without deleting protocol/content dependencies.
5. Update service-worker scope/path logic and protocol-source references.
6. Update tests that assume the `fluxa/` filesystem location.
7. Add a temporary `/fluxa/` redirect.
8. Run every Fluxa regression test and JavaScript syntax check.
9. Smoke-test root hosting with a local HTTP server:
   - initial load,
   - open/close session,
   - Assistido selection,
   - investigation,
   - treatment creation/resume,
   - Hawkins baseline/final flow,
   - history/report access,
   - refresh while online,
   - refresh while offline after first load.
10. Validate GitHub Pages at the root URL before removing any temporary compatibility artifacts.
11. Confirm `/fluxa/` redirects to the root and does not expose a second independent app.

## Migration acceptance criteria

- The root URL opens Fluxa, not the legacy application.
- No runtime request for a required Fluxa asset returns 404.
- Treatment/protocol discovery remains complete.
- Service-worker installation succeeds with root scope.
- Offline reload works after one successful online visit.
- Existing local Fluxa data remains readable; migration must not change storage keys merely because the URL path changed unless a deliberate storage migration is added and tested.
- `/fluxa/` redirects to the root during the compatibility period.
- There is only one canonical Fluxa runtime after migration.
- All automated Fluxa tests are green on the exact migration head SHA.

## Explicit non-goals for this preparation PR

- No files are moved.
- No legacy root files are deleted.
- No service-worker behavior is changed.
- No GitHub Pages routing is changed.
- No visual/domain/session/treatment behavior is changed.
