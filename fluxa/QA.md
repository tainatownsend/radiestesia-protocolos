# Fluxa — therapist workflow regression checklist

Use this checklist before merging PR #2. Fluxa remains local-first and the legacy root application must remain untouched.

## Assisted context guard

- With zero active assistidos, tapping Investigar / Tratar / Reiki / Anotar / Avaliar opens an explanation and `Cadastrar assistido` action instead of leaving a disabled dead end.
- After creating the first assistido from that guard during an open session, Fluxa selects it and resumes the original activity automatically.
- With existing assistidos but none selected, the guard lists them and also offers `Cadastrar novo assistido`.
- Selecting an existing assistido resumes the original activity automatically.
- Custom protocol start uses the same guard.
- Out-of-session forms containing `assistedEntityId` show explicit Portuguese guidance when no assisted entity exists or no value is selected.
- Switching assisted context never rewrites records previously created for another assisted entity.

## Session and preparation

- Starting from Hoje with no session creates exactly one OPEN session.
- Repeated taps on Iniciar sessão never create a second OPEN session.
- Reload with an OPEN session restores the same session.
- Preparation progress survives reload.
- Preparation shows one current base step at a time with `Etapa X de 4` guidance.
- Completing one step advances to the next step.
- Structured frequency/protection fields remain hidden until all four base steps are complete.
- Final preparation step requires vibrational frequency and at least one protection resource/manual description.
- Protection resources selected from Biblioteca are preserved as historical snapshots.
- Preparation wording can be personalized from Biblioteca and the personalized labels appear without changing the required sequence.
- Measurement/investigation/treatment-review workflows require an OPEN prepared session even through older UI paths.

## “Nesta sessão” workspace

- After preparation, Hoje shows a `Nesta sessão` summary.
- Summary counts assistidos, investigations, treatments and Reiki recorded in the work window.
- Activity is grouped per assisted entity.
- `Usar agora` changes the current assisted context without modifying earlier records.
- As new work is recorded, the session summary updates.
- The `Investigações` action lists relevant completed/in-progress investigations.
- Incomplete investigation can be resumed after selecting its assisted entity.

## Safe closing

- Tapping `Revisar e encerrar` opens the session review before the existing closing confirmation.
- Review shows counts for assistidos, investigations, treatments and Reiki.
- Open investigations are disclosed as work that will remain resumable.
- RUNNING/PAUSED Reiki linked to the session blocks `Prosseguir para encerramento seguro`.
- Completing/canceling linked Reiki removes the block.
- Treatments remain longitudinal and are never auto-completed by session closing.
- Proceeding from review opens the existing final closing procedure exactly once.
- Forgotten sessions remain explicit Continue / Correct closing flows.
- Corrected closing preserves `endedAt` separately from `closedRecordedAt` and rejects <= start/future timestamps.

## Reports

- Session close review offers `Resumo interno da sessão`.
- It also offers one distinct report button for each assisted entity touched in the session.
- Per-assisted reports never include another assisted entity's investigations/assessments/Reiki/treatments.
- Reports include session timing, assessments, investigations, confirmed findings, treatments/components and Reiki.
- Browser print works from the report window.
- Browser Save as PDF works on supported desktop/mobile browsers.
- Closed Session history exposes report actions again.
- Reopened reports are reconstructed from preserved history and remain consistent with the original session data.

## Assisted entities and return summary

- Pessoa requires birth date.
- Grupo requires at least one member and every member requires full name + birth date.
- Ambiente requires full address.
- Situação/Processo requires identifier and structured involved/requesting person.
- PET accepts open descriptive details.
- Editing records `ASSISTED_UPDATED` without rewriting prior events.
- Assisted type cannot change.
- Archiving preserves history and is blocked while active work exists.
- Archived assistidos remain consultable read-only.
- Search/type filters work.
- Assisted detail shows `Resumo para retorno` with current treatments, latest assessment, recent finding and last session activity.

## Investigation continuity / findings

- Sim/Não persists immediately.
- Reload restores the exact current question/node.
- Ending a session does not discard incomplete investigation.
- Resume in later session requires the new session to be prepared.
- Resume records `INVESTIGATION_RESUMED`, preserving origin and exact current node.
- Positive answers never become Findings automatically.
- Re-confirming does not duplicate the same source finding.
- Multiple findings from one investigation may have different classifications.
- Classification is restricted to Causa, Mantenedor, Consequência, Associação, Fator relevante or Item a aprofundar.

## Built-in protocols

- Triagem rápida v1 is available.
- Investigação inicial v1 is available.
- Investigação completa v1 is available.
- Causa raiz v1 is available.
- Protocolo específico v1 is available.
- Every built-in execution stores immutable protocol version snapshot.
- YES/NO follows only configured next nodes.
- Branching start/answer/resume/consolidation requires prepared session + valid assistido.

## Meus protocolos

- Biblioteca contains `Meus protocolos` and `Novo protocolo`.
- A custom protocol can contain multiple questions.
- Each question accepts `Próxima`, `Fim`, or a specific question number for YES and NO paths.
- Invalid destination is rejected explicitly.
- Active Biblioteca resources can be associated to the protocol.
- Resource names are stored as snapshots in the protocol version.
- Saving a change creates a higher version instead of overwriting prior versions.
- Starting from Biblioteca or the Investigar chooser uses the latest version.
- An execution stores the complete protocol snapshot/version used.
- Resource snapshot remains unchanged after a Library resource is renamed later.
- Custom execution autosaves every answer.
- Reload/resume returns to the exact custom current node.
- Completed custom protocol asks for explicit finding confirmation and individual classification.

## Treatment planning / lifecycle / traceability

- Planned treatment can be created outside session but requires at least one component.
- Earlier data with an empty PLANNED treatment can receive components before activation.
- Planned components have no startedAt/expectedEndAt until activation.
- Starting planned treatment requires OPEN prepared session.
- Archived Library resource cannot be newly linked; historical snapshots remain.
- Multiple components can be created initially and added later.
- Duration may be omitted.
- Interrupt/resume preserves the same treatment and timing history.
- Stop/replace preserve original component/event history.
- Deadline-bearing component cannot be reviewed before expectedEndAt.
- No-deadline component can be reviewed manually.
- Component dismantles only with 100% complete + permission.
- Final assessment waits until all components are resolved.
- Final assessment requires prepared session, frequency and imbalance 0–100%.
- Follow-up is a new PLANNED cycle linked to previous treatment/assessment.
- One final assessment can originate at most one follow-up cycle.
- Treatment card/history shows source Investigation → Finding where applicable.
- Assisted detail shows Finding → linked treatment(s), or `Ainda sem tratamento vinculado`.

## Reiki

- Reiki can run inside or outside session when no radiesthesia measurement is involved.
- Modes: Presencial, À distância, Autoaplicação, Outro.
- Only one RUNNING/PAUSED application exists at a time.
- Timer derives elapsed time from persisted timestamp intervals.
- Pause/resume/reload/background preserve elapsed duration.
- Completion stores duration/mode/notes without closing Session.
- Cancel preserves partial history and records `REIKI_CANCELED`.
- Retrospective completed Reiki can be recorded without Session.
- Session Reiki offers optional treatment link for the selected assisted entity.
- Out-of-session/retrospective Reiki forms update their optional treatment choices when the assisted entity changes.
- Linked Reiki record preserves `treatmentId` without changing the treatment lifecycle.

## Biblioteca / Avaliar

- Gráfico, Biômetro and Outro resources can be created/edited/archived/searched/filtered.
- Resource edits never rewrite historical snapshots.
- Usage count reflects linked treatment components.
- Resource can be selected during treatment creation/planning/follow-up/add/replace flows.
- Avaliar requires OPEN prepared session + valid assisted context.
- General assessment appears in longitudinal history.
- Biblioteca contains preparation wording preferences and Meus protocolos.

## Backup / recovery

- Normalized schema remains version 5 and includes `customProtocols` + `settings`.
- Reload retains custom protocols and preparation preferences.
- Export JSON contains custom protocol versions/settings.
- Import of a valid older Fluxa backup canonicalizes missing customProtocols/settings safely.
- Structurally invalid unrelated JSON is rejected.
- Recovery remains preferred over older backup when primary fails.
- Same-tab modules synchronize.
- Same-origin browser tabs synchronize primary localStorage updates.
- Hoje shows a backup reminder if no confirmed export exists.
- Successful export stores the confirmed export timestamp.
- Recent confirmed export suppresses the reminder for seven days.
- A failed/non-executed export must not count as a confirmed backup.

## Therapist-facing language

- No-assistido context uses `Escolher quem será atendido` rather than a silent disabled control.
- Session action section reads `O que você deseja fazer agora?`.
- Investigation continuity uses `Retomar investigação`.
- Closing action reads `Revisar e encerrar`.
- Raw technical status/type enums do not leak into normal visible product copy.

## Mobile / one hand

- Primary controls have comfortable touch targets.
- Sim/Não remain large/stable.
- Reiki pause/resume/complete/cancel remain reachable without precision tapping.
- New session dashboard does not horizontally overflow at 320px.
- Custom protocol editor questions stack on narrow screens.
- Closing review/report buttons stack rather than overflow.
- Bottom navigation stays stable outside focused overlays.

## Accessibility

- Visible keyboard focus.
- Dialog has role=dialog, aria-modal and accessible title/fallback label.
- Focus enters new dialogs and remains trapped with Tab/Shift+Tab.
- Escape closes supported overlays and restores focus when possible.
- Close buttons/form controls expose accessible names.
- Guided preparation progress exposes status semantics.
- Reiki timers use role=timer with aria-live=off.
- Status is not color-only.
- Forced-colors/high-contrast keeps boundaries visible.
- Reduced-motion disables nonessential movement.

## Automated regression

GitHub Actions runs syntax validation for every Fluxa `.js`/`.mjs` file, then:

- `domain.test.mjs`
- `session-rules.test.mjs`
- `store.test.mjs`
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

- End-to-end therapist workflow starting with zero assistidos.
- End-to-end workflow with multiple assistidos in the same Session.
- Multiple investigations and exact resume behavior.
- Custom protocol creation/versioning/branching/resource snapshots.
- Closing review + reports with realistic populated states.
- Report print/save-PDF on iPhone/iPad.
- Safari/iPhone keyboard open/closed.
- Repeated background/foreground and reload during Reiki on a real device.
- iPad portrait/landscape.
- VoiceOver/iOS navigation and dialogs.
- Actual private-mode/localStorage quota failure behavior.
- Export → clear/import → restore on target browser.
- Full Deep Teal visual hierarchy pass with realistic data.

## Legacy isolation

- Root `/index.html` remains untouched.
- Fluxa remains under `/fluxa` until explicit publication decision.
- PR #2 remains Draft until automated checks are green and the manual mobile workflow is ready for validation.
