# Fluxa MVP — regression checklist

Use this checklist before merging. The MVP is local-only and the legacy root application must remain untouched.

## Session and preparation

- Starting from Hoje with no session creates exactly one OPEN session.
- Repeated taps on Iniciar sessão do not create a second OPEN session.
- Reload with an OPEN session restores the same session.
- Preparation progress survives reload.
- Preparation cannot conclude with checklist only: vibrational frequency must be recorded.
- Preparation cannot conclude without at least one protection resource or manual protection description.
- Protection resources selected from Biblioteca are preserved as snapshots for session history.
- Session work actions are presented only after preparation is complete.
- Closing a session leaves active treatments untouched.
- Closing is blocked while Reiki linked to the session is running or paused.
- An unfinished investigation may remain open when the session closes.
- Forgotten sessions are never auto-closed.
- Forgotten-session UI offers Continue and Correct closing.
- Corrected closing stores actual `endedAt` separately from `closedRecordedAt`.
- Corrected closing cannot use a time before/equal to session start or a future time.
- Session history shows structured preparation data and the session timeline.

## Assisted context

- Every investigation, treatment, Reiki application and note has an explicit assistedEntityId.
- Switching assisted context never mutates records already created for another assisted entity.
- Person requires date of birth.
- Group requires at least one member and every member requires full name + birth date.
- Environment requires full address.
- Situation/Process requires identifier and a structured involved/requesting person.
- PET accepts open descriptive details.
- Editing records `ASSISTED_UPDATED` without rewriting prior historical events.
- Assisted type stays stable during MVP editing.
- Archiving preserves history and removes the assisted entity from future-work lists.
- Archiving is blocked while treatment, investigation or Reiki work remains active.
- Archived assisted entities remain consultable in read-only history.
- Assistidos search and type filters work with populated lists.

## Investigation continuity / findings

- Sim/Não answer is persisted immediately.
- Reload restores the same investigation and current question/node.
- Ending a session does not complete or discard an unfinished investigation.
- Opening a later session and resuming records INVESTIGATION_RESUMED.
- `originSessionId` remains unchanged after resume.
- Positive answers do not become Findings without explicit confirmation.
- Re-confirming a finding does not create duplicates for the same investigation/source question.
- Multiple findings from one investigation can receive different classifications.
- Classification choices are Cause, Maintainer, Consequence, Association, Relevant factor, Item to deepen.

## Protocol library

- Every execution stores its immutable protocol version snapshot.
- YES/NO follow only the configured next node.
- Invalid/missing next nodes fail explicitly.
- End nodes complete the investigation without auto-creating findings.
- Confirmed findings preserve source question/node and classification.
- Triagem rápida is available as the simple investigation path.
- Investigação inicial v1 is available.
- Investigação completa v1 is available.
- Causa raiz v1 is available.
- Protocolo específico v1 is available as the neutral specific-deepening path.
- Branching protocols require open prepared session + selected assisted entity.
- Branching resume returns to the exact saved node, including across sessions.

## Treatment planning and lifecycle

- Planned treatment can be created outside a session.
- Planned treatment can contain multiple components.
- Planned components do not receive `startedAt`/`expectedEndAt` until activation.
- Starting a planned treatment requires an open prepared session.
- Direct treatment creation inside a prepared session remains available without investigation.
- Multiple components can be created initially and added later.
- Components can be linked to Library resources with historical snapshots.
- Components can have duration or no defined deadline.
- Treatment remains active after its origin session closes.
- Reaching `expectedEndAt` derives “Revisão disponível” without changing Treatment.status.
- Interrupting preserves treatment/components and records TREATMENT_INTERRUPTED.
- Resuming preserves the same treatment and records TREATMENT_RESUMED.
- Interruption time shifts active component expectedEndAt by default.
- Stopping preserves the component as STOPPED.
- Replacing creates a new component and preserves the original as REPLACED with replacement link.
- Component review is individual.
- Component becomes COMPLETED/dismantled only with both 100% complete + permission to dismantle.
- Negative/incomplete component review is retained without completion.
- Final assessment is unavailable until all components are COMPLETED, STOPPED or REPLACED.
- Final assessment requires vibrational frequency and imbalance percentage.
- Final assessment records whether another treatment is needed and optional timing/notes.
- Current treatment becomes COMPLETED after final resolution/assessment.
- A recommended next cycle is a separate PLANNED treatment linked to the previous treatment/assessment.
- The previous completed treatment is never reopened or overwritten.
- Administrative completion outside a session requires resolved components and explicit confirmation that no new measurement is occurring.
- Treatment filters Ativos / Para revisão / Planejados / Concluídos / Todos work.
- Treatment history shows component lifecycle, assessments and timeline.

## Reiki

- Reiki can run inside a session or outside a session when no radiesthesia measurement is involved.
- Modes: Presencial, À distância, Autoaplicação and Outro.
- Only one RUNNING or PAUSED Reiki application may exist at a time.
- Timer duration is calculated from timestamp intervals.
- Pause stops elapsed-time accumulation.
- Resume creates a new interval.
- Reload/background reconstructs elapsed duration correctly.
- Completing stores duration, mode and notes without closing the session.
- Retrospective completed Reiki can be registered without an open session.

## Biblioteca / Avaliar

- Resources can be created as Graph, Biometer or Other.
- Resources can be edited without rewriting historical treatment/session snapshots.
- Resources can be archived while historical use remains visible.
- Search and type filters work.
- Usage count reflects linked treatment components.
- Library resource can be selected during initial treatment creation, planning, add-component and replacement flows.
- Avaliar requires an open prepared session and selected assisted entity.
- General assessment appears in longitudinal assisted history.

## Local persistence / recovery

- Reload retains sessions, preparation data, assistidos, investigations, findings, treatments, reviews, assessments, Reiki and tools.
- Failed primary JSON parse falls back to valid backup/recovery.
- Recovery snapshot is written before primary replacement on save.
- Separate store instances in the same tab synchronize.
- Autosave does not create logical duplicates on repeated ordinary actions.
- Storage-health check detects inability to write localStorage.
- Corrupt primary with valid backup exposes recovery.
- Recovery copies valid candidate back to primary.
- Export produces current valid local JSON.
- Import accepts valid Fluxa JSON and rejects unrelated/invalid JSON before replacement.
- Import preserves previous valid primary as backup.

## Mobile / one hand

- Primary controls have comfortable touch targets.
- Sim and Não remain large/stable on focused investigation screens.
- Reiki pause/resume/complete remain reachable without precision tapping.
- Treatment component actions work on narrow screens.
- Button rows stack instead of overflowing.
- Bottom navigation remains stable outside focused sheets.
- No horizontal overflow at 320px CSS width.

## Accessibility

- Visible keyboard focus.
- Focus enters newly opened dialogs.
- Escape closes active closable dialogs.
- Dialogs expose role=dialog, aria-modal=true and accessible title.
- Close buttons have accessible names.
- Form controls have labels/accessible names.
- Reiki timer exposes timer semantics without announcing every second.
- Status is not communicated only by color.
- Forced-colors/high-contrast keeps boundaries visible.
- Reduced-motion disables nonessential movement.

## Automated regression

GitHub Actions runs:

- `domain.test.mjs`
- `protocol-engine.test.mjs`
- `remaining.test.mjs`
- `storage-health.test.mjs`
- `activity-library.test.mjs`
- `treatment-planning.test.mjs`
- `administrative-treatment.test.mjs`
- `reiki-flex.test.mjs`
- `follow-up-treatment.test.mjs`
- `structured-preparation.test.mjs`
- `final-assessment-rules.test.mjs`
- `static-smoke.test.mjs`

## Manual validation still required before merge

- Safari/iPhone with keyboard open/closed and repeated background/foreground transitions.
- Reiki timer background/foreground on a real device.
- iPad portrait/landscape.
- localStorage quota/private-mode behavior on actual target browsers.
- Export → clear/import → restore on real iOS browser.
- VoiceOver/iOS navigation and dialogs.
- Full Deep Teal visual hierarchy pass with populated real-world states.

## Legacy isolation

- Root `/index.html` remains untouched by Fluxa MVP work.
- Fluxa remains under `/fluxa` until explicit validation/publication decision.
