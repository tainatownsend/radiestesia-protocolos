# Fluxa MVP foundation

Fluxa is a new local-only product being built inside the isolated `/fluxa` directory. The legacy root application remains untouched during validation.

## Product boundary

- Mobile-first Deep Teal shell.
- Exactly four main destinations: Hoje, Tratamentos, Assistidos, Biblioteca.
- One open therapist `Session` at a time.
- No login, backend, cloud sync, multi-device conflict handling or legacy-data migration in the MVP.
- Session timestamps, activity timestamps and record-creation timestamps remain distinct.

## Session / workspace

- Session preparation is autosaved and belongs to the session.
- Preparation records breathing, vibrational-frequency measurement, protection resources/notes and protection/permission completion.
- Library resources used for protection are preserved as snapshots so later library edits do not rewrite historical sessions.
- Multiple assisted entities can be worked with during one therapist session by switching explicit context.
- Quick notes are linked to both session and assisted entity.
- Closing a session never completes longitudinal treatments automatically.
- Active/paused Reiki linked to the session blocks closure.
- Forgotten sessions are never auto-closed; Continue and Correct closing are explicit choices.
- Corrected closing stores actual `endedAt` separately from `closedRecordedAt`.
- Session history exposes preparation details and event timeline contextually without adding a fifth navigation destination.

## Assisted entities

Supported types: Person, PET, Environment, Group, Situation/Process and Other.

- Person requires date of birth.
- Group requires at least one member; every member requires full name and birth date.
- Environment requires full address.
- PET supports open descriptive details.
- Situation/Process requires identifier plus a structured involved/requesting person field.
- Assisted entities have longitudinal history, contextual summaries and search/type filtering.
- Editing preserves previous events instead of rewriting them.
- Type remains fixed during MVP editing.
- Archiving is soft, preserves history and is blocked while active work exists.
- Archived assisted entities remain consultable in a read-only contextual view.

## Investigations / findings

- Answers are persisted immediately.
- Incomplete investigations can resume in later sessions while preserving `originSessionId` and exact current position/node.
- Every protocol execution stores an immutable protocol snapshot/version.
- Positive answers never become findings automatically.
- Findings are explicitly confirmed and individually classified.
- Finding classifications: Cause, Maintainer, Consequence, Association, Relevant factor, Item to deepen.
- Findings keep traceability back to investigation/question snapshot and can be linked to treatment origin.

### MVP protocol set

- Triagem rápida v1.
- Investigação inicial v1.
- Investigação completa v1.
- Causa raiz v1.
- Protocolo específico v1 as a neutral specific-deepening flow.

`Meus protocolos` / full protocol authoring remains later work.

## Treatments

- Treatment is longitudinal and independent from Session lifetime.
- Direct treatment creation is supported without a prior investigation.
- Planned treatments can be created outside a session and started only inside an open prepared session.
- Planned treatments support multiple components; duration starts only when the planned treatment is activated.
- Treatment components may have independent durations or no defined deadline.
- Multiple components can be created initially or added later.
- Library resources can be linked to components with immutable snapshots.
- Components can be stopped or replaced without overwriting historical records.
- Treatment interruption is immutable history; resumption does not create a new treatment.
- By default, interruption time shifts active component `expectedEndAt` so prescribed active duration is preserved.
- Component dismantling review requires both: 100% complete and permission to dismantle.
- Negative/incomplete reviews are retained without completing the component.
- Final assessment unlocks only after all components are resolved.
- Final assessment requires vibrational frequency and imbalance percentage and records whether another cycle is needed.
- The completed treatment remains closed even when a new future cycle is recommended.
- A recommended next cycle can be created as a separate `PLANNED` treatment linked to the previous treatment/assessment.
- Administrative completion is allowed outside session only when all components are resolved and no new measurement is being performed.
- Treatment list includes contextual status filters and detailed treatment history.

## Reiki

- MVP scope is timer + application record only; there are no guided positions/steps.
- Modes: Presential, Distance, Self-application and Other.
- Reiki may run inside a session or independently outside a session when no radiesthesia measurement is involved.
- Only one active/paused Reiki application is allowed at a time.
- Timer duration is reconstructed from timestamp intervals and survives reload/background.
- Pause/resume create persisted intervals.
- Completion stores total duration and notes.
- Retrospective completed Reiki recording is supported outside session.

## Activity library / assessments

- Biblioteca stores reusable Graph, Biometer and Other resource entries.
- Resources can be created, edited, archived, searched and filtered.
- Historical treatment/session records preserve resource snapshots rather than depending on current library names.
- Library UI shows contextual usage count in treatment components.
- `Avaliar` records a general measurement/result linked to the current prepared session and assisted entity.

## Local persistence / recovery

- Primary, backup and recovery snapshots are validated independently.
- Saves write a recovery snapshot before replacing the primary record.
- In-tab store instances synchronize to prevent stale layered UI modules from overwriting newer state.
- Visible health warning appears for corrupt/unwritable storage.
- Valid backup/recovery data can be restored explicitly.
- JSON export and validated import are available locally.
- Import preserves the previous valid primary dataset as backup before replacement.

## Accessibility / mobile hardening

- Dialog semantics and accessible titles.
- Focus moves into opened dialogs; Escape closes when a close action exists.
- Accessible names for close buttons and form controls.
- Timer semantics without announcing every second.
- Visible focus, forced-colors/high-contrast handling and reduced-motion support.
- Large touch targets and narrow-screen stacking.
- Sim/Não remains a focused large-control pattern.

## Core data contracts

- `Session`: therapist work window.
- `PreparationRun`: session preparation, including structured frequency/protection data.
- `AssistedEntity`: person/group/pet/environment/process/other receiving the work.
- `Event`: immutable timeline/audit projection source.
- `Investigation`: frozen protocol execution able to continue across sessions.
- `Finding`: explicitly confirmed/classified investigation result.
- `Treatment`: longitudinal process independent from session lifetime.
- `TreatmentComponent`: concrete resource/component with independent lifecycle/timing.
- `TreatmentComponentReview`: component-specific completion/permission verification.
- `Assessment`: general or final post-treatment measurement/decision record.
- `ReikiApplication`: timer/application record with persisted intervals and mode.
- `Tool`: reusable local Library resource.

## Automated checks

GitHub Actions runs regression suites for core domain behavior, branching protocols, treatment lifecycle, storage recovery/import, activity library, treatment planning, administrative completion, Reiki, follow-up cycles, structured preparation, final-assessment rules and static shell integrity.

## Remaining before merge/product validation

The remaining MVP work is primarily validation/refinement rather than missing core domain architecture:

1. Real Safari/iPhone QA, including keyboard and repeated background/foreground transitions.
2. iPad portrait/landscape QA.
3. VoiceOver/iOS accessibility pass and fixes.
4. Real target-browser localStorage private-mode/quota behavior.
5. Export → clear/import → restore validation on real iOS browser.
6. Screen-by-screen visual hierarchy pass against approved Deep Teal mockups using populated states.
7. Consolidate layered UI modules after MVP validation if long-term maintainability becomes the next priority.

## Explicitly later / phase 2

- Authentication and cloud sync.
- Legacy migration.
- Agenda/CRM/billing/client portal.
- Reports/PDF advanced outputs.
- Full custom protocol editor / `Meus protocolos`.

## Validation principle

Keep this branch isolated until the core workflow is visually and functionally validated. Do not replace the legacy root `index.html` yet.
