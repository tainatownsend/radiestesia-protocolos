# Fluxa — therapist workflow MVP

Fluxa is a local-first therapist workspace isolated under `/fluxa`. The legacy application at the repository root remains untouched.

## Product boundary

- Mobile-first Deep Teal interface.
- Exactly four main destinations: Hoje, Tratamentos, Assistidos, Biblioteca.
- One open therapist `Session` at a time.
- No login, backend, cloud sync, multi-device sync or legacy-data migration in the current product.
- Radiesthesia measurement, investigation, direct treatment creation/change and therapeutic review require an open prepared session.
- Prepared-session invariants are enforced at the core domain boundary as well as by the UI guards.
- Session timestamps, activity timestamps and record-creation timestamps remain distinct.

## Therapist session workflow

The intended flow is now explicit:

`Iniciar sessão → Preparação guiada → Escolher assistido → Avaliar/Investigar/Tratar/Reiki → trocar assistido quando necessário → revisar a sessão → gerar relatórios → encerramento seguro`.

### Preparation

- Autosaved and owned by the session.
- Presented sequentially, one current step at a time.
- Base steps: breathing/presence, frequency measurement, protection and permission/mantra.
- Structured record includes vibrational frequency, optional scale, protection resources/snapshots, manual protection notes and permission notes.
- Structured completion validates all four base steps, current frequency and at least one protection resource/manual protection description before writing `PREPARATION_COMPLETED`.
- Step wording can be customized from Biblioteca without changing the safety/order rules.
- Library resources used during preparation are preserved as historical snapshots.
- A previous completed preparation may be used only as a safe shortcut for reusable preferences such as scale and still-active protection resources; no preparation step is auto-completed and the current frequency is never copied.

### Assisted context guard

Any activity that requires an assisted entity uses the same rule:

- if none exists, Fluxa explains why one is required and offers `Cadastrar assistido`;
- if assisted entities exist but none is selected, Fluxa asks the therapist to select one or create another;
- after selection/creation inside a session, the original activity is resumed automatically;
- out-of-session forms with an `assistedEntityId` use explicit Portuguese validation instead of relying only on browser-native required-field messages.

Assisted type validation is centralized in the core domain, so direct creation and UI flows share the same requirements. `Situação/Processo` stores its involved/requesting person as the structured `relatedPerson` field at creation rather than patching it later.

For recurring daily use, assisted pickers can be searched and favorited. Favorites and most-recently-used assisted entities are surfaced first without changing therapeutic records.

### “Nesta sessão” workspace

A prepared session exposes a contextual summary grouped by assisted entity:

- assisted entities touched in this work window;
- investigations;
- treatments;
- Reiki applications;
- assessments;
- quick switching back to the assisted entity currently being worked with.

Multiple investigations can be reviewed from a dedicated session view, including incomplete investigations that started in a previous session.

### Daily-use interaction layer

The current PR adds an explicit fast-use layer intended for phone/iPad operation while the therapist is working:

- Deep Teal visual hierarchy and tablet/mobile-specific sheets/navigation;
- optional `Modo atendimento` to reduce nonessential context during the active session;
- persistent `Atendimento atual` context with quick assisted switching;
- `Hoje` exposes a short `Para continuar` queue for open investigations and planned/interrupted treatments when no session is open;
- large Sim/Não and touch-chip controls for finding classifications and Reiki mode;
- quick imbalance choices at 0/25/50/75/100%, while arbitrary 0–100 values remain available;
- duration presets (`30 min`, `1 h`, `1 dia`, `7 dias`, `Sem prazo`);
- recent treatment-title suggestions for the selected assisted entity;
- optional treatment objective stored separately from the treatment title;
- `Repetir última configuração` for a previously used Library resource, copying only the previous command/duration fields into the current draft;
- universal search across assisted entities, treatments, Library resources/tags and protocols;
- longitudinal assisted summary with current work, latest assessment and simple imbalance evolution;
- searchable Library picker with favorites and usage context rather than long mobile selects;
- virtual-keyboard adaptation using the visible iOS/iPad viewport so sheets and controls remain reachable while typing.

### Roteiros de sessão

Biblioteca can store optional reusable session shortcut sequences.

- A roteiro has a name and an ordered subset of Avaliar, Investigar, Tratar, Reiki and Anotar.
- Roteiros are persisted inside Fluxa settings and survive reload/export/import with the rest of the local state.
- In a prepared session, the `Roteiro` action exposes those steps as large shortcuts.
- A roteiro never answers an investigation, marks preparation complete, creates treatment decisions or advances automatically; every therapeutic action still requires the therapist's explicit tap and the normal Fluxa validation.

### Safe closing and reports

Before the existing closing procedure, Fluxa shows a session safety review with:

- number of assisted entities worked with;
- investigations completed/open;
- treatments created/changed;
- Reiki applications;
- warning for investigations that will remain open;
- hard block when Reiki linked to the session is still RUNNING/PAUSED.

The therapist can generate:

- an internal session summary;
- one separate report per assisted entity, so information from different people is never mixed;
- a shorter `Resumo para compartilhar` layer for client-facing sharing when appropriate.

Reports contain session timing, assessments, investigations, confirmed findings, treatments/components, optional therapeutic objective and Reiki records. Product-facing report copy never falls back to raw technical enum/protocol IDs. They open as printable documents and can be printed or saved as PDF by the browser. Reports can also be regenerated later from Session history. The shareable layer intentionally omits internal component commands and internal session notes.

## Assisted entities and longitudinal history

Supported types: Pessoa, PET, Ambiente, Grupo, Situação/Processo and Outro.

- Pessoa requires birth date.
- Grupo requires at least one member, each with full name and birth date.
- Ambiente requires full address.
- Situação/Processo requires identifier plus involved/requesting person.
- These requirements are enforced by the core assisted-domain validator, not only by forms.
- Type remains immutable during MVP editing.
- Archive is soft, preserves history and is blocked while active work exists.
- Archived assisted entities remain consultable read-only.
- Search/type filters are available.
- The assisted detail includes a `Resumo para retorno`: current treatments, latest assessment, recent finding and most recent session activity.
- Longitudinal insights include counts and a compact imbalance trend when enough final assessments exist.

## Investigations, findings and protocols

### Built-in protocol set

- Triagem rápida v1.
- Investigação inicial v1.
- Investigação completa v1.
- Causa raiz v1.
- Protocolo específico v1.

All built-in executions are versioned/snapshotted and can resume at the exact current point. The legacy/core Triagem APIs now enforce prepared-session requirements for start, resume, answer and finding confirmation, so a caller cannot bypass preparation by skipping the UI.

Positive answers never become findings automatically. Findings are explicitly confirmed and individually classified as:

- Causa;
- Mantenedor;
- Consequência;
- Associação;
- Fator relevante;
- Item a aprofundar.

### Meus protocolos

Biblioteca includes a local custom protocol editor.

- Create a protocol with a name/description.
- Add any number of Sim/Não questions.
- Configure each YES/NO path to Próxima, Fim or a specific question number.
- Associate active Biblioteca resources/graphs with the protocol.
- Saving an edit creates a new immutable version instead of rewriting the previous version.
- Resource associations are stored as snapshots so later Library edits do not rewrite older protocol versions/executions.
- Executions autosave, resume across prepared sessions and preserve the exact protocol-version snapshot used.
- Completed custom investigations use the same explicit finding confirmation/classification principle.

## Treatments and traceability

- Treatment is longitudinal and independent from Session lifetime.
- Direct and planned treatments are supported.
- Direct treatment creation and legacy treatment review require an open prepared session at the core-domain boundary.
- Planned treatments can be created administratively outside session but activate only inside a prepared session.
- Planned treatments require components; compatibility flow allows an earlier empty plan to receive components before activation.
- Treatment title and optional therapeutic objective are distinct fields.
- Components can have independent duration or no deadline.
- Library resources are stored by immutable snapshot.
- Adding/replacing an active component with a `sessionId` requires that session to be prepared; administrative lifecycle operations remain separate.
- Components can be added, stopped or replaced without rewriting history.
- Review before a defined `expectedEndAt` is blocked; no-deadline components can be reviewed manually.
- Dismantling requires both 100% complete + permission to dismantle.
- Final assessment requires all components resolved, prepared session, vibrational frequency and imbalance 0–100%, enforced in the domain as well as the UI.
- Follow-up treatment is a new PLANNED cycle linked to the previous treatment/assessment; one assessment can originate at most one next cycle.
- Administrative completion outside a session is allowed only when components are already resolved and no new measurement is performed.
- Treatment-card/history identity is anchored to `treatmentId`, never visible title text or visual list position, so equal titles/reordering cannot cross-wire actions.
- Treatment history displays previous/next cycles and the assessment/planning origin when available.

Traceability is visible in both directions:

- Treatment → source investigation/finding.
- Finding → treatment(s) linked to that finding.

## Reiki

- Timer + application record only; no guided positions.
- Modes: Presencial, À distância, Autoaplicação and Outro.
- May run inside or outside Session when no radiesthesia measurement is involved.
- Only one RUNNING/PAUSED application at a time.
- Timestamp intervals preserve elapsed time across reload/background.
- Pause/resume/completion/cancellation preserve history.
- Retrospective completed recording is supported.
- Reiki can optionally be linked to an active/planned treatment so the therapeutic context remains explicit in the longitudinal record.
- History shows therapist-facing Reiki mode and completed duration when available.

## Biblioteca / Avaliar

- Reusable Gráfico, Biômetro and Outro resources.
- Create, edit, archive, search and filter.
- Optional free-form tags are normalized/deduplicated and searchable.
- When tags exist, Biblioteca exposes a derived tag filter that combines with text search and resource type.
- Bulk import accepts CSV, TSV, TXT, pasted spreadsheet data or one-resource-per-line lists.
- Bulk spreadsheet format supports `Nome`, `Tipo`, `Finalidade`, `Tags` and `Observações`.
- Bulk import previews the new resources and ignores duplicate active names before saving.
- A downloadable CSV template is available from the import sheet.
- Active Library resources can also be exported back to CSV for spreadsheet maintenance / round-trip editing, preserving tags.
- Library resources can be favorited; favorites are shown first in the Library and in searchable treatment/resource pickers.
- Searchable pickers show usage context so a ~150-resource Library remains practical on phone/tablet.
- Historical snapshots protect earlier records from later Library edits.
- Usage counts expose treatment-component reuse.
- `Avaliar` records a general measurement/result linked to the prepared session and selected assisted entity.
- Biblioteca also contains custom-protocol authoring, preparation wording preferences and session shortcut templates.

## Local persistence, backup and recovery

- Normalized local schema version 5.
- `customProtocols`, preparation settings and session shortcut templates are part of normalized/exported state through `settings`.
- Primary, backup and recovery snapshots are validated independently.
- Recovery is written before primary replacement and is preferred when primary becomes unreadable.
- Same-tab modules and same-origin browser tabs synchronize local state.
- JSON import/export is validated and earlier valid primary state is preserved as backup during import.
- A visible reminder appears when no confirmed export exists or the latest confirmed export is old.
- The export timestamp is recorded only by the successful export function.

UI-only favorites are local convenience preferences and do not alter or rewrite therapeutic history.

This remains device-local protection, not cloud backup. Losing/clearing the device can still lose data that was never exported.

## Installable / offline daily use

- Fluxa exposes a web-app manifest with the Deep Teal theme and Fluxa home-screen icon.
- On supported browsers it can be added to the device Home Screen and opened in standalone app mode.
- A scoped service worker uses a network-first strategy: while online, current files are requested from the network; cached files are fallback only when the network is unavailable.
- The service worker precaches the local module graph referenced by the Fluxa shell, so imported browser modules remain available in offline fallback after a successful online installation.
- A newly published version never forces an in-session reload; Fluxa offers an explicit update action.
- When the browser reports offline state, Fluxa shows `Sem conexão · trabalhando com a cópia local do Fluxa`.
- Offline capability does not replace local-data export/backup and does not introduce cloud sync.

## Accessibility/mobile hardening

- Dialog semantics and deterministic accessible titles.
- Focus enters dialogs and is trapped with Tab/Shift+Tab.
- Escape closes supported dialogs and restores focus when possible.
- Accessible names for close buttons and form fields.
- Timer semantics avoid announcing every second.
- Large touch targets, narrow-screen stacking, forced-colors and reduced-motion support.
- Sim/Não remains a focused large-control pattern.
- Search, picker and favorite controls are designed to stay usable with one-hand phone input and iPad layouts.
- Therapist-facing copy favors action language such as `Escolher quem será atendido`, `O que você deseja fazer agora?` and `Revisar e encerrar`.

## Automated checks

GitHub Actions runs:

- JavaScript syntax validation for all Fluxa `.js`/`.mjs` modules;
- core session/domain tests;
- dedicated core-domain prepared-session invariant regression;
- prepared-session helper invariants;
- store recovery and settings/template persistence tests;
- protocol-engine tests;
- treatment lifecycle and planning;
- storage import/recovery;
- Library/assessment behavior;
- bulk Library parser/import/export/tag round-trip regression;
- administrative completion;
- Reiki lifecycle;
- follow-up treatment cycles;
- structured preparation;
- final-assessment rules;
- report privacy/product-copy regression;
- static shell dependency/branding/install/offline/stable-ID checks, including daily-use modules and Deep Teal theme metadata.

## Manual validation still required

1. Full end-to-end therapist flow with zero assisted entities, one assisted entity and multiple assisted entities.
2. Assisted favorites/search/recent ordering with realistic lists.
3. `Para continuar` queue with open investigations and planned/interrupted treatments.
4. Multiple simultaneous/incomplete investigations and exact resume behavior.
5. Custom protocol creation, branching, versioning and resource snapshots.
6. Session shortcut template creation/edit/delete/use and confirmation that it never auto-completes therapeutic work.
7. Session safety review and per-assisted reports with realistic populated data.
8. Internal vs shareable report behavior and print/save-to-PDF on iPhone/iPad.
9. Bulk Library import/export with a real large spreadsheet/list, tags, tag filter and searchable/favorite resource picking.
10. Preparation reuse shortcut confirms that only scale/protection preferences are copied and no step/current frequency is auto-completed.
11. Safari/iPhone keyboard open/closed, reload and repeated background/foreground transitions.
12. Reiki timer background/foreground on a real device.
13. iPad portrait/landscape and Modo atendimento.
14. Add Fluxa to the Home Screen on the target device and confirm standalone launch.
15. Load once online, switch to airplane/offline mode and confirm an offline reload uses the cached Fluxa shell and shows the offline status banner.
16. VoiceOver/iOS.
17. Actual private-mode/localStorage quota/failure behavior.
18. Export → clear/import → restore on the target browser.
19. Full Deep Teal visual hierarchy pass with populated real-world states.

## Explicitly later

- Authentication and cloud/multi-device sync.
- Legacy data migration.
- Agenda/CRM/billing/client portal.
- Rich branded PDF templates, signatures or automated delivery beyond browser print/save-PDF.
- Major consolidation/refactor of the layered MVP UI architecture after behavioral validation.

## Validation principle

Keep Fluxa under `/fluxa` until these therapist workflows are validated in the target devices. The legacy root application remains independent.
