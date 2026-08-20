# Fluxa MVP foundation

Fluxa is being built as a new, local-only product inside an isolated `/fluxa` directory so the existing application can remain untouched during validation.

## Implemented in this branch

### Foundation
- Deep Teal mobile-first shell with four destinations: Hoje, Tratamentos, Assistidos, Biblioteca.
- Local persistence with stable client-side IDs and a last-known backup.
- One open `Session` at a time.
- Event-derived timelines.
- No login, backend, cloud synchronization or legacy-data migration in the MVP.

### Session / workspace
- Session preparation with autosaved steps.
- `AssistedEntity` creation and explicit session context.
- Autosaved quick notes.
- Safe closing confirmation that does not close longitudinal treatments.
- Closing is blocked while an active/paused Reiki timer still belongs to the session.
- Unfinished investigations may remain open after session closure.

### Investigation
- Versioned sample protocol (`Triagem rápida`).
- Investigation with large Sim/Não controls and immediate persistence.
- Investigation stores a frozen protocol snapshot/version.
- Unfinished investigation can be resumed in a later open session while preserving its origin session.
- Resume creates an `INVESTIGATION_RESUMED` event in the new session.
- Explicit consolidation step: positive answers do not automatically become findings.
- Findings preserve traceability to investigation/question snapshots.

### Treatment
- Longitudinal `Treatment` separated from `Session`.
- Direct treatment creation is allowed without a preceding investigation.
- Treatment components have their own duration and calculated expected end.
- Derived “Revisão disponível” condition when an active component reaches its expected end.
- Treatments remain active after session closure.
- Treatment interruption preserves history and components.
- Interrupted treatment can be resumed without creating a new treatment.
- Treatment review requires an open session because it represents a new measurement.
- Reviews are stored separately; verified completion closes components and treatment while preserving prior events.

### Reiki
- MVP Reiki is timer + application record only; there are no guided positions/steps.
- Active timer uses timestamp intervals rather than a volatile in-memory counter.
- Pause and resume are supported.
- Reload can reconstruct elapsed time from saved intervals.
- Completing Reiki stores total duration and optional notes without closing the session.
- Retrospective completed Reiki applications can be registered outside a session.

### Assisted history
- Assisted detail view projects its longitudinal history from events.
- Active treatments and unfinished investigations are summarized per assisted entity.

## Core data contracts

- `Session`: therapist work window.
- `AssistedEntity`: person/group/pet/environment/process/other receiving the work.
- `Event`: immutable timeline/audit projection source.
- `Investigation`: protocol execution tied to a frozen protocol version snapshot and able to continue across sessions.
- `Finding`: confirmed result of an investigation, separate from raw answers.
- `Treatment`: longitudinal process independent from session lifetime.
- `TreatmentComponent`: concrete graph/tool/component with its own timing.
- `TreatmentReview`: measurement/review event that can conclude a treatment.
- `ReikiApplication`: timer/application record with persisted intervals.

## Local-only MVP

There is intentionally no login, account, backend, cloud synchronization, migration from the legacy app, or multi-device conflict handling in this branch.

## Remaining backlog increments

1. Session forgotten-open correction flow with actual `endedAt` distinct from `closedRecordedAt`.
2. Treatment resume timing policy for components whose original expected end passed during an interruption.
3. Richer treatment component lifecycle (multiple components, add/replace/stop without overwriting history).
4. Protocol branching engine and broader versioned library.
5. Structured treatment review flow for final frequency / imbalance and decision to create a new treatment when imbalance remains.
6. More complete assisted fields for person/group/environment/PET/process according to type.
7. Local persistence hardening for storage-full/write-failure UX and recovery.
8. End-to-end mobile QA and accessibility regression.

## QA

See `QA.md` for the regression checklist covering session continuity, assisted context, investigation resume, treatment lifecycle, Reiki timer, local persistence and mobile one-hand use.

## Validation principle

This branch should stay isolated until the core workflow is visually and functionally validated. Do not replace the legacy root `index.html` yet.
