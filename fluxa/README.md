# Fluxa — therapist workflow MVP

Fluxa is a local-first therapist workspace isolated under `/fluxa`. The legacy application at the repository root remains untouched.

## Product boundary

- Mobile-first Deep Teal interface.
- Exactly four main destinations: Hoje, Tratamentos, Assistidos, Biblioteca.
- One open therapist `Session` at a time.
- No login, backend, cloud sync, multi-device sync or legacy-data migration in the current product.
- Radiesthesia measurement, investigation and therapeutic review require an open prepared session.
- Session timestamps, activity timestamps and record-creation timestamps remain distinct.

## Therapist session workflow

The intended flow is now explicit:

`Iniciar sessão → Preparação guiada → Escolher assistido → Avaliar/Investigar/Tratar/Reiki → trocar assistido quando necessário → revisar a sessão → gerar relatórios → encerramento seguro`.

### Preparation

- Autosaved and owned by the session.
- Presented sequentially, one current step at a time.
- Base steps: breathing/presence, frequency measurement, protection and permission/mantra.
- Structured record includes vibrational frequency, optional scale, protection resources/snapshots, manual protection notes and permission notes.
- Step wording can be customized from Biblioteca without changing the safety/order rules.
- Library resources used during preparation are preserved as historical snapshots.

### Assisted context guard

Any activity that requires an assisted entity uses the same rule:

- if none exists, Fluxa explains why one is required and offers `Cadastrar assistido`;
- if assisted entities exist but none is selected, Fluxa asks the therapist to select one or create another;
- after selection/creation inside a session, the original activity is resumed automatically;
- out-of-session forms with an `assistedEntityId` use explicit Portuguese validation instead of relying only on browser-native required-field messages.

### “Nesta sessão” workspace

A prepared session exposes a contextual summary grouped by assisted entity:

- assisted entities touched in this work window;
- investigations;
- treatments;
- Reiki applications;
- assessments;
- quick switching back to the assisted entity currently being worked with.

Multiple investigations can be reviewed from a dedicated session view, including incomplete investigations that started in a previous session.

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
- one separate report per assisted entity, so information from different people is never mixed.

Reports contain session timing, assessments, investigations, confirmed findings, treatments/components and Reiki records. They open as printable documents and can be printed or saved as PDF by the browser. Reports can also be regenerated later from Session history.

## Assisted entities and longitudinal history

Supported types: Pessoa, PET, Ambiente, Grupo, Situação/Processo and Outro.

- Pessoa requires birth date.
- Grupo requires at least one member, each with full name and birth date.
- Ambiente requires full address.
- Situação/Processo requires identifier plus involved/requesting person.
- Type remains immutable during MVP editing.
- Archive is soft, preserves history and is blocked while active work exists.
- Archived assisted entities remain consultable read-only.
- Search/type filters are available.
- The assisted detail includes a “Resumo para retorno”: current treatments, latest assessment, recent finding and most recent session activity.

## Investigations, findings and protocols

### Built-in protocol set

- Triagem rápida v1.
- Investigação inicial v1.
- Investigação completa v1.
- Causa raiz v1.
- Protocolo específico v1.

All built-in executions are versioned/snapshotted and can resume at the exact current point.

Positive answers never become findings automatically. Findings are explicitly confirmed and individually classified as:

- Causa;
- Mantenedor;
- Consequência;
- Associação;
- Fator relevante;
- Item a aprofundar.

### Meus protocolos

Biblioteca now includes a local custom protocol editor.

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
- Planned treatments can be created administratively outside session but activate only inside a prepared session.
- Planned treatments require components; compatibility flow allows an earlier empty plan to receive components before activation.
- Components can have independent duration or no deadline.
- Library resources are stored by immutable snapshot.
- Components can be added, stopped or replaced without rewriting history.
- Review before a defined `expectedEndAt` is blocked; no-deadline components can be reviewed manually.
- Dismantling requires both 100% complete + permission to dismantle.
- Final assessment requires all components resolved, prepared session, vibrational frequency and imbalance 0–100%.
- Follow-up treatment is a new PLANNED cycle linked to the previous treatment/assessment; one assessment can originate at most one next cycle.
- Administrative completion outside a session is allowed only when components are already resolved and no new measurement is performed.

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

## Biblioteca / Avaliar

- Reusable Gráfico, Biômetro and Outro resources.
- Create, edit, archive, search and filter.
- Historical snapshots protect earlier records from later Library edits.
- Usage counts expose treatment-component reuse.
- `Avaliar` records a general measurement/result linked to the prepared session and selected assisted entity.
- Biblioteca also contains custom-protocol authoring and preparation wording preferences.

## Local persistence, backup and recovery

- Normalized local schema version 5.
- `customProtocols` and preparation settings are part of normalized/exported state.
- Primary, backup and recovery snapshots are validated independently.
- Recovery is written before primary replacement and is preferred when primary becomes unreadable.
- Same-tab modules and same-origin browser tabs synchronize local state.
- JSON import/export is validated and earlier valid primary state is preserved as backup during import.
- A visible reminder appears when no confirmed export exists or the latest confirmed export is old.
- The export timestamp is recorded only by the successful export function.

This remains device-local protection, not cloud backup. Losing/clearing the device can still lose data that was never exported.

## Accessibility/mobile hardening

- Dialog semantics and deterministic accessible titles.
- Focus enters dialogs and is trapped with Tab/Shift+Tab.
- Escape closes supported dialogs and restores focus when possible.
- Accessible names for close buttons and form fields.
- Timer semantics avoid announcing every second.
- Large touch targets, narrow-screen stacking, forced-colors and reduced-motion support.
- Sim/Não remains a focused large-control pattern.
- Therapist-facing copy favors action language such as “Escolher quem será atendido”, “O que você deseja fazer agora?” and “Revisar e encerrar”.

## Automated checks

GitHub Actions runs:

- JavaScript syntax validation for all Fluxa `.js`/`.mjs` modules;
- core session/domain tests;
- prepared-session invariants;
- store recovery tests;
- protocol-engine tests;
- treatment lifecycle and planning;
- storage import/recovery;
- Library/assessment behavior;
- administrative completion;
- Reiki lifecycle;
- follow-up treatment cycles;
- structured preparation;
- final-assessment rules;
- static shell dependency/branding checks.

## Manual validation still required

1. Full end-to-end therapist flow with zero assisted entities, one assisted entity and multiple assisted entities.
2. Multiple simultaneous/incomplete investigations and exact resume behavior.
3. Custom protocol creation, branching, versioning and resource snapshots.
4. Session safety review and per-assisted reports with realistic populated data.
5. Report print/save-to-PDF behavior on iPhone/iPad.
6. Safari/iPhone keyboard open/closed, reload and repeated background/foreground transitions.
7. Reiki timer background/foreground on a real device.
8. iPad portrait/landscape.
9. VoiceOver/iOS.
10. Actual private-mode/localStorage quota/failure behavior.
11. Export → clear/import → restore on the target browser.
12. Full Deep Teal visual hierarchy pass with populated real-world states.

## Explicitly later

- Authentication and cloud/multi-device sync.
- Legacy data migration.
- Agenda/CRM/billing/client portal.
- Rich branded PDF templates, signatures or automated delivery beyond browser print/save-PDF.
- Major consolidation/refactor of the layered MVP UI architecture after behavioral validation.

## Validation principle

Keep Fluxa under `/fluxa` until these therapist workflows are validated in the target devices. The legacy root application remains independent.
