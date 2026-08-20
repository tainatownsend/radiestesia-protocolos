# Fluxa MVP foundation

Fluxa is being built as a new, local-only product inside an isolated `/fluxa` directory so the existing application can remain untouched during validation.

## Implemented in this branch

### Foundation
- Deep Teal mobile-first shell with four destinations: Hoje, Tratamentos, Assistidos, Biblioteca.
- Local persistence with stable client-side IDs, backup and a separate recovery snapshot.
- Multiple in-tab store instances synchronize so the base UI and backlog modules cannot overwrite one another with stale state.
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
- A possibly forgotten open session is never auto-closed: the UI offers Continue or Correct closing.
- Corrected closing preserves the actual `endedAt` separately from `closedRecordedAt` and creates a correction event.

### Assisted entities
- Person requires full identification and date of birth.
- Group remains a persistent assisted entity and captures members with full names and birth dates.
- Environment/property requires a descriptive name and full address.
- PET supports open descriptive details.
- Situation/process captures process identification and involved/requesting person details.
- Longitudinal assisted detail projects history from events.
- Assisted entities can be edited without rewriting prior events.
- Assisted type stays fixed during MVP edits to preserve historical meaning.
- Assisted entities can be archived while retaining all history; active work blocks archival.

### Investigation / protocol library
- Versioned sample protocol (`Triagem rápida`).
- Investigation with large Sim/Não controls and immediate persistence.
- Investigation stores a frozen protocol snapshot/version.
- Unfinished investigation can be resumed in a later open session while preserving its origin session.
- Resume creates an `INVESTIGATION_RESUMED` event in the new session.
- Explicit consolidation step: positive answers do not automatically become findings.
- Findings preserve traceability to investigation/question snapshots.
- Generic branching protocol engine added with immutable version snapshots and node-based yes/no routing.
- Initial branching library includes `Investigação inicial` v1 and `Causa raiz` v1.
- Branching results support explicit finding classification: cause, maintainer, consequence, association, relevant factor or item to deepen.

### Treatment
- Longitudinal `Treatment` separated from `Session`.
- Direct treatment creation is allowed without a preceding investigation.
- Treatment components have their own duration and calculated expected end.
- Derived “Revisão disponível” condition when an active component reaches its expected end.
- Treatments remain active after session closure.
- Treatment interruption preserves history and components.
- Interrupted treatment can be resumed without creating a new treatment.
- By default, time spent interrupted does not consume the component's prescribed duration: active component `expectedEndAt` is shifted by the interruption period and the reschedule is recorded.
- Multiple treatment components can be added independently.
- Components can be stopped or replaced without overwriting prior records; replacements retain a link to the original component.
- Each component has its own dismantling review: 100% complete + permission to dismantle.
- Component reviews are stored independently; only two positive answers complete/dismantle the component.
- Final assessment is unlocked only when every component is resolved (completed, stopped or replaced).
- Structured final assessment captures vibrational-frequency text/value, imbalance percentage, whether a new treatment is needed and when.
- After component resolution and final assessment, the current treatment is completed even if a future treatment cycle is recommended.

### Reiki
- MVP Reiki is timer + application record only; there are no guided positions/steps.
- Active timer uses timestamp intervals rather than a volatile in-memory counter.
- Pause and resume are supported.
- Reload can reconstruct elapsed time from saved intervals.
- Completing Reiki stores total duration and optional notes without closing the session.
- Retrospective completed Reiki applications can be registered outside a session.

### Local recovery / privacy-oriented handling
- Primary, backup and recovery local snapshots are validated independently.
- Visible storage warning appears when writes cannot be confirmed or primary data is corrupt.
- Valid backup/recovery data can be restored to the primary record.
- User can export the current valid local dataset as JSON from Hoje.
- No cloud/account data path exists in the MVP.

### Accessibility / mobile hardening
- Dialog semantics and accessible titles are applied across the layered UI.
- Close buttons receive accessible names.
- Focus moves into newly opened dialogs and Escape can close the active dialog.
- Reiki timer uses timer semantics without announcing every second.
- Form controls receive accessible names where the base markup lacks explicit linkage.
- Focus-visible, high-contrast/forced-colors and reduced-motion handling are included.
- Narrow action rows stack instead of relying on precision tapping.

## Core data contracts

- `Session`: therapist work window.
- `AssistedEntity`: person/group/pet/environment/process/other receiving the work.
- `Event`: immutable timeline/audit projection source.
- `Investigation`: protocol execution tied to a frozen protocol version snapshot and able to continue across sessions.
- `Finding`: confirmed result of an investigation, separate from raw answers.
- `Treatment`: longitudinal process independent from session lifetime.
- `TreatmentComponent`: concrete graph/tool/component with its own timing and lifecycle.
- `TreatmentComponentReview`: component-specific completion/permission verification.
- `TreatmentReview`: treatment-level measurement/review event.
- `Assessment`: final post-treatment measurement/decision record.
- `ReikiApplication`: timer/application record with persisted intervals.

## Local-only MVP

There is intentionally no login, account, backend, cloud synchronization, migration from the legacy app, or multi-device conflict handling in this branch.

## Automated checks

- `domain.test.mjs` covers session behavior, cross-session investigation resume, corrected closing, treatment interruption/resume timing, multi-component replacement, final assessment, Reiki elapsed time and minimum assisted fields.
- `protocol-engine.test.mjs` covers branching paths, protocol version identity and explicit finding confirmation/classification.
- `remaining.test.mjs` covers component dismantling, assisted edit/archive safety and treatment completion after final assessment.
- `storage-health.test.mjs` covers corrupt-primary detection and local recovery.
- `.github/workflows/fluxa-domain.yml` runs all four suites on branch changes and pull requests.

## Remaining work before product validation

The core MVP backlog is now largely implemented. Remaining work is primarily validation/refinement rather than missing domain architecture:

1. Run end-to-end mobile QA on real Safari/iPhone and iPad, including background/foreground and keyboard states.
2. Run VoiceOver/accessibility regression and fix issues found on-device.
3. Validate localStorage quota/private-mode failure behavior on target browsers.
4. Perform a final visual pass against the approved Deep Teal mockups with populated real-world states.
5. Expand protocol content/version authoring only after the representative engine is validated.
6. Reports/PDF remain phase 2 unless intentionally pulled forward.

## QA

See `QA.md` for the detailed regression checklist.

## Validation principle

This branch should stay isolated until the core workflow is visually and functionally validated. Do not replace the legacy root `index.html` yet.
