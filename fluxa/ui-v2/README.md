# Fluxa UI V2

This directory is the clean-slate presentation layer for Fluxa.

## Contract

- Reuse the existing domain/store/persistence core.
- Render final DOM directly from state.
- Do not visually post-process DOM with MutationObserver.
- Do not import legacy UI enhancer modules or legacy visual CSS.
- One component owns each surface.
- One scroll owner per page/sheet.
- One visually dominant action per state.
- Safe-area and keyboard behavior belong to structural primitives.
- New V2 work must follow `../docs/FLUXA_UI_V2_BLUEPRINT.md`.

## Preview

`../v2.html` is an isolated V2 preview entrypoint. During structural phases it uses deterministic fixtures and must not mutate the user's real Fluxa data.

## Cutover

The existing `/fluxa/` entrypoint remains untouched until V2 reaches the blueprint cutover criteria.