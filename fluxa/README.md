# Fluxa MVP foundation

Fluxa is being built as a new, local-only product inside an isolated `/fluxa` directory so the existing application can remain untouched during validation.

## Implemented in this branch

- Deep Teal mobile-first shell with four destinations: Hoje, Tratamentos, Assistidos, Biblioteca.
- Local persistence with stable client-side IDs and a last-known backup.
- One open `Session` at a time.
- Session preparation with autosaved steps.
- `AssistedEntity` creation and explicit session context.
- Event-derived session timeline.
- Autosaved quick notes.
- Versioned sample protocol (`Triagem rápida`).
- Investigation with large Sim/Não controls and immediate persistence.
- Explicit consolidation step: positive answers do not automatically become findings.
- Findings with traceability to investigation/question snapshots.
- Longitudinal Treatment separated from Session.
- Treatment component with calculated expected end from start + duration.
- Treatments remain active after session closure and appear outside sessions.
- Derived “Revisão disponível” condition when a component reaches its expected end.

## Core data contracts

- `Session`: therapist work window.
- `AssistedEntity`: person/group/pet/environment/process/other receiving the work.
- `Event`: immutable timeline/audit projection source.
- `Investigation`: protocol execution tied to a frozen protocol version snapshot.
- `Finding`: confirmed result of an investigation, separate from raw answers.
- `Treatment`: longitudinal process independent from session lifetime.
- `TreatmentComponent`: concrete graph/tool/component with its own timing.

## Local-only MVP

There is intentionally no login, account, backend, cloud synchronization, migration from the legacy app, or multi-device conflict handling in this branch.

## Known next increments

1. Resume an unfinished investigation in a later open session while preserving the original session and adding a resume event.
2. Full safe-closing checklist and correction flow for a session forgotten open.
3. Treatment interruption, resume, review and component dismantling lifecycle.
4. Reiki timer + application record only (no guided positions).
5. Assisted longitudinal history.
6. Expand protocol library and protocol branching/version management.
7. Local persistence hardening/QA for storage failure and recovery.

## Validation principle

This branch should stay isolated until the core workflow is visually and functionally validated. Do not replace the legacy root `index.html` yet.
