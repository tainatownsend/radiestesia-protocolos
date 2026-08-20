# Fluxa MVP — regression checklist

Use this checklist before merging. The MVP is local-only and the legacy root application must remain untouched.

## Session and preparation

- Starting from Hoje with no session creates exactly one OPEN session.
- Repeated taps on Iniciar sessão do not create a second OPEN session.
- Reload with an OPEN session restores the same session.
- Preparation progress survives reload.
- Preparation cannot conclude with checklist only: vibrational frequency must be recorded.
- Preparation cannot conclude without at least one protection resource or manual protection description.
- Protection resources selected from Biblioteca are preserved as historical snapshots.
- Measurement/investigation/treatment-review workflows require an OPEN prepared session even if invoked through an older UI path.
- Closing a session leaves longitudinal treatments untouched.
- Closing is blocked while Reiki linked to the session is RUNNING or PAUSED; completing or canceling it unblocks closure.
- An unfinished investigation may remain open when the session closes.
- Forgotten sessions are never auto-closed.
- Forgotten-session UI offers Continue and Correct closing.
- Corrected closing stores actual `endedAt` separately from `closedRecordedAt` and rejects <= start/future timestamps.
- Session history shows structured preparation data and event timeline.

## Assisted context

- Every investigation, treatment, Reiki application and note has explicit assistedEntityId.
- Switching assisted context never mutates earlier records.
- Pessoa requires date of birth.
- Grupo requires at least one member and every member requires full name + birth date.
- Ambiente requires full address.
- Situação/Processo requires identifier and structured involved/requesting person.
- PET accepts open descriptive details.
- Editing records `ASSISTED_UPDATED` without rewriting prior events.
- Assisted type cannot change in the MVP, including through direct domain calls.
- Archiving preserves history and is blocked while treatment/investigation/Reiki work is active.
- Archived assistidos remain consultable read-only.
- Search and type filters work with populated lists.

## Investigation continuity / findings

- Sim/Não persists immediately.
- Reload restores the exact current question/node.
- Ending a session does not discard incomplete investigation.
- Resume in a later session first requires that new session to be prepared.
- Resume records `INVESTIGATION_RESUMED` while preserving `originSessionId` and current node.
- Positive answers never become Findings automatically.
- Re-confirming does not duplicate the same source finding.
- Multiple findings from one investigation may have different classifications.
- Classification is restricted to Causa, Mantenedor, Consequência, Associação, Fator relevante or Item a aprofundar.

## Protocol library

- Every execution stores immutable protocol version snapshot.
- YES/NO follow only configured next node; invalid path fails explicitly.
- End nodes do not auto-create findings.
- Triagem rápida v1, Investigação inicial v1, Investigação completa v1, Causa raiz v1 and Protocolo específico v1 are available.
- Branching start/answer/resume/consolidation require prepared session + valid assistido.

## Treatment planning and lifecycle

- Planned treatment can be created outside session but requires at least one component.
- Earlier MVP data containing a PLANNED treatment with zero components can be completed by adding a component before activation.
- Planned components have no startedAt/expectedEndAt before activation.
- Starting a planned treatment requires OPEN prepared session and at least one planned component.
- Archived Library resource cannot be newly linked; historical snapshot remains valid.
- Multiple components can be created initially and added later.
- Duration may be omitted; deadline-bearing components calculate independent expectedEndAt.
- Treatment remains active after origin session closes.
- Interrupt/resume preserves the same treatment and shifts expected end by pause duration by default.
- Stop and replace preserve original component/event history.
- A component with a future expectedEndAt cannot be reviewed yet.
- A component without expectedEndAt can be reviewed manually.
- Component dismantles only when both 100% complete + permission to dismantle are positive.
- PLANNED / IN_PROGRESS / INTERRUPTED components all count as unresolved.
- Final assessment is unavailable until all components are COMPLETED / STOPPED / REPLACED.
- Final assessment requires OPEN prepared session, vibrational frequency and imbalance 0–100%.
- Completed treatment remains immutable when another cycle is recommended.
- Follow-up cycle is a separate PLANNED treatment with its own component(s), previousTreatmentId and recommendedByAssessmentId.
- One final assessment can originate at most one follow-up cycle, even after that follow-up later completes.
- Administrative completion outside session is allowed only with resolved components and explicit no-new-measurement confirmation.
- Treatment filters and detailed contextual history work with mixed statuses.

## Reiki

- Reiki can run inside session or outside session without radiesthesia measurement.
- Modes: Presencial, À distância, Autoaplicação, Outro.
- Only one RUNNING/PAUSED Reiki application exists at a time.
- Timer derives elapsed time from persisted timestamp intervals.
- Pause stops accumulation; resume creates a new interval.
- Reload/background reconstructs elapsed duration.
- Completing stores duration/mode/notes without closing Session.
- Cancelar closes a running interval if needed, sets CANCELED, preserves partial history and records `REIKI_CANCELED`.
- After canceling, a new Reiki application can start.
- Retrospective completed Reiki can be recorded without Session.

## Biblioteca / Avaliar

- Gráfico, Biômetro and Outro resources can be created/edited/archived/searched/filtered.
- Resource edits never rewrite historical snapshots.
- Usage count reflects linked treatment components.
- Resource can be selected during initial treatment, planning, follow-up planning, add-component and replacement flows.
- Avaliar requires OPEN prepared session and valid assistido even below the UI layer.
- General assessment appears in longitudinal history.

## Local persistence / recovery

- Normalized schema is version 5 and explicitly includes componentReviews/tools and all core arrays.
- Reload retains all MVP entities/events.
- Same-tab store modules synchronize.
- Two browser tabs on the same origin receive primary localStorage updates without cloud sync.
- Recovery snapshot is written before primary replacement.
- Unwritable localStorage surfaces storage warning.
- Structurally invalid or unrelated parseable JSON is not accepted as Fluxa data.
- Valid backup/recovery is canonicalized to current schema during restore.
- Import canonicalizes valid earlier Fluxa schema, preserves previous valid primary as backup and rejects malformed collection types.
- Export only emits structurally valid current local data.

## Mobile / one hand

- Primary controls have comfortable touch targets.
- Sim/Não remain large/stable.
- Reiki pause/resume/complete/cancel remain reachable without precision tapping.
- Treatment component controls work on narrow screens.
- Button rows stack rather than overflow.
- Bottom navigation stays stable outside focused overlays.
- No horizontal overflow at 320px CSS width.

## Accessibility

- Visible keyboard focus.
- Dialog has role=dialog, aria-modal and accessible title/fallback label.
- Dialog IDs are deterministic within page lifecycle.
- Focus enters new dialog and Tab/Shift+Tab remain within active dialog.
- Escape closes supported overlays and focus returns to prior trigger when possible.
- Close buttons and form controls expose accessible names.
- Both Reiki timer variants use role=timer with aria-live=off.
- Status is not color-only.
- Forced-colors/high-contrast keeps boundaries visible.
- Reduced-motion disables nonessential movement.
- Visible product copy does not expose raw status/type enums.

## Automated regression

GitHub Actions runs:

- `domain.test.mjs`
- `session-rules.test.mjs`
- `protocol-engine.test.mjs`
- `remaining.test.mjs`
- `storage-health.test.mjs`
- `activity-library.test.mjs`
- `treatment-planning.test.mjs`
- `administrative-treatment.test.mjs`
- `reiki-flex.test.mjs`
- `reiki-lifecycle.test.mjs`
- `follow-up-treatment.test.mjs`
- `structured-preparation.test.mjs`
- `final-assessment-rules.test.mjs`
- `static-smoke.test.mjs`

## Manual validation still required before merge

These items cannot be credibly closed by code inspection/CI alone:

- Safari/iPhone with keyboard open/closed.
- Repeated background/foreground and reload during Reiki timer on a real device.
- iPad portrait/landscape.
- VoiceOver/iOS navigation, focus order and dialogs.
- Actual target-browser private mode / localStorage quota failure behavior.
- Export → clear/import → restore on real target browser.
- Full Deep Teal visual hierarchy pass with realistic populated states.
- End-to-end therapist workflow regression after pulling the final branch.

## Legacy isolation

- Root `/index.html` remains untouched.
- Fluxa remains under `/fluxa` until explicit validation/publication decision.
- PR stays Draft until manual validation is complete.
