# Fluxa MVP foundation

Fluxa is a new local-only product being built inside the isolated `/fluxa` directory. The legacy root application remains untouched during validation.

## Product boundary

- Mobile-first Deep Teal shell.
- Exactly four main destinations: Hoje, Tratamentos, Assistidos, Biblioteca.
- One open therapist `Session` at a time.
- No login, backend, cloud sync, multi-device sync or legacy-data migration in the MVP.
- Session timestamps, activity timestamps and record-creation timestamps remain distinct.
- Radiesthesia measurements/investigations/treatment reviews require an open **prepared** session at both UI and workflow/domain boundaries.

## Session / workspace

- Session preparation is autosaved and belongs to the session.
- Preparation records breathing, vibrational-frequency measurement, scale, protection resources/snapshots or manual protection notes, and protection/permission completion.
- Library resources used for protection are preserved as snapshots so later library edits do not rewrite historical sessions.
- Multiple assisted entities can be worked with during one therapist session by switching explicit context.
- Quick notes are linked to both session and assisted entity.
- Closing a session never completes longitudinal treatments automatically.
- Active/paused Reiki linked to the session blocks closure until completed or canceled.
- Forgotten sessions are never auto-closed; Continue and Correct closing are explicit choices.
- Corrected closing stores actual `endedAt` separately from `closedRecordedAt` and rejects times at/before the start or in the future.
- Session history exposes preparation details and event timeline contextually without adding a fifth navigation destination.

## Assisted entities

Supported types: Pessoa, PET, Ambiente, Grupo, Situação/Processo and Outro.

- Pessoa requires date of birth.
- Grupo requires at least one member; every member requires full name and birth date.
- Ambiente requires full address.
- PET supports open descriptive details.
- Situação/Processo requires identifier plus a structured involved/requesting person field.
- Assisted entities have longitudinal history, contextual summaries and search/type filtering.
- Editing preserves previous events instead of rewriting them.
- Type remains fixed during MVP editing and is enforced below the UI layer.
- Archiving is soft, preserves history and is blocked while active work exists.
- Archived assisted entities remain consultable in a read-only contextual view.

## Investigations / findings

- Answers are persisted immediately.
- Incomplete investigations can resume in later prepared sessions while preserving `originSessionId` and exact current position/node.
- Every protocol execution stores an immutable protocol snapshot/version.
- Positive answers never become findings automatically.
- Findings are explicitly confirmed and individually classified.
- Finding classifications: Causa, Mantenedor, Consequência, Associação, Fator relevante, Item a aprofundar.
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
- Direct treatment creation is supported without a prior investigation, but therapeutic activation occurs within a prepared session.
- Planned treatments can be created outside a session and started only inside an open prepared session.
- New planned treatments require at least one component; earlier branch data containing an empty planned treatment can be completed by adding components before activation.
- Planned treatments support multiple components; duration starts only when the planned treatment is activated.
- Treatment components may have independent durations or no defined deadline.
- Multiple components can be created initially or added later.
- Library resources can be linked to components with immutable snapshots; archived resources cannot be newly linked.
- Components can be stopped or replaced without overwriting historical records.
- Treatment interruption is immutable history; resumption does not create a new treatment.
- By default, interruption time shifts active component `expectedEndAt` so prescribed active duration is preserved.
- A component with a deadline cannot be reviewed before `expectedEndAt`; a component without a deadline may be reviewed manually when clinically appropriate.
- Component dismantling review requires both: 100% complete and permission to dismantle.
- Negative/incomplete reviews are retained without completing the component.
- Final assessment unlocks only after every component is resolved; PLANNED, IN_PROGRESS and INTERRUPTED components remain unresolved.
- Final assessment requires a prepared session, vibrational frequency and imbalance percentage from 0–100%.
- The completed treatment remains closed even when a new future cycle is recommended.
- A recommended next cycle is a separate `PLANNED` treatment with its own required component(s), linked to the previous treatment and the final assessment.
- One final assessment can originate at most one follow-up cycle; later continuity must come from the next cycle's own assessment.
- Administrative completion is allowed outside session only when all components are resolved and no new measurement is being performed.
- Treatment list includes contextual status filters and detailed treatment history.

## Reiki

- MVP scope is timer + application record only; there are no guided positions/steps.
- Modes: Presencial, À distância, Autoaplicação and Outro.
- Reiki may run inside a session or independently outside a session when no radiesthesia measurement is involved.
- Only one RUNNING/PAUSED Reiki application is allowed at a time.
- Timer duration is reconstructed from timestamp intervals and survives reload/background.
- Pause/resume create persisted intervals.
- Completion stores total duration and notes.
- Cancellation is explicit, preserves the partial application and records `REIKI_CANCELED` instead of deleting history.
- Retrospective completed Reiki recording is supported outside session.

## Activity library / assessments

- Biblioteca stores reusable Gráfico, Biômetro and Outro resource entries.
- Resources can be created, edited, archived, searched and filtered.
- Historical treatment/session records preserve resource snapshots rather than depending on current library names.
- Library UI shows contextual usage count in treatment components.
- `Avaliar` records a general measurement/result linked to the current prepared session and assisted entity.

## Local persistence / recovery

- Current normalized local schema is version 5.
- Primary, backup and recovery snapshots are structurally validated independently.
- Saves write a recovery snapshot before replacing the primary record.
- Multiple store modules in the same tab synchronize to avoid stale overwrites.
- Browser tabs on the same device/origin synchronize from the primary localStorage update event. This is not cloud or multi-device sync.
- Visible health warning appears for corrupt/unwritable storage.
- Parseable unrelated JSON is not accepted as a Fluxa backup.
- Valid backup/recovery data is canonicalized to the current local schema when restored/imported.
- JSON export and validated import are available locally.
- Import preserves the previous valid primary dataset as backup before replacement.

## Accessibility / mobile hardening

- Dialog semantics and accessible titles.
- Deterministic dialog IDs.
- Focus moves into opened dialogs and is trapped within the active dialog with Tab/Shift+Tab.
- Escape closes supported dialogs and focus is restored to the prior trigger when possible.
- Accessible names for close buttons and form controls.
- Session and outside-session Reiki timers expose timer semantics without announcing every second.
- Visible focus, forced-colors/high-contrast handling and reduced-motion support.
- Large touch targets and narrow-screen stacking.
- Sim/Não remains a focused large-control pattern.
- Visible technical enums/event names are translated to product-language copy.

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
- `ReikiApplication`: timer/application record with persisted intervals, mode and optional cancellation history.
- `Tool`: reusable local Library resource.

## Automated checks

GitHub Actions runs regression suites for:

- core session/domain behavior;
- prepared-session invariants;
- branching protocols and immutable execution snapshots;
- component/assistido treatment lifecycle;
- local storage recovery/import/schema validation;
- activity library and general assessments;
- planned treatment creation/activation and compatibility with earlier empty plans;
- administrative treatment completion;
- Reiki timer/modes and explicit cancellation;
- follow-up treatment cycles and one-cycle-per-assessment invariant;
- structured preparation;
- final-assessment input rules;
- static shell dependencies/branding.

## Implementation ceiling reached before manual validation

The core local-only MVP backlog is implemented to the point where remaining work depends on real-browser/device observation or is intentionally phase 2. No additional product behavior should be added merely to avoid testing.

### Manual validation still required

1. Safari/iPhone with keyboard open/closed, reloads and repeated background/foreground transitions.
2. iPad portrait/landscape.
3. VoiceOver/iOS full interaction pass.
4. Actual private-mode/localStorage quota/failure behavior on target browsers.
5. Export → clear/import → restore on a real target browser.
6. Screen-by-screen visual hierarchy pass against the approved Deep Teal mockups with populated data.
7. End-to-end regression of the real therapist workflows after pulling this branch.

### Explicitly later / phase 2

- Authentication and cloud/multi-device sync.
- Legacy migration.
- Agenda/CRM/billing/client portal.
- Reports/PDF advanced outputs.
- Full custom protocol editor / `Meus protocolos`.
- Major consolidation/refactor of the layered MVP UI architecture after behavior is validated.

## Validation principle

Keep this branch isolated until the core workflow is visually and functionally validated. Do not replace the legacy root `index.html` yet.
