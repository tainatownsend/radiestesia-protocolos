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
- With six or more assisted entities, picker search filters by name without altering records.
- Favoriting an assisted entity changes only picker ordering; favorites appear before non-favorites.
- Among equal favorite status, recently used assisted entities appear before older ones.

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
- `Usar preferências` from a previous completed preparation may prefill only reusable scale / still-active protection selections.
- Reusing preparation preferences never copies the current vibrational-frequency value and never marks any base step complete.
- Measurement/investigation/treatment-review workflows require an OPEN prepared session even through older UI paths.

## “Nesta sessão” workspace / fast flow

- After preparation, Hoje shows a `Nesta sessão` summary.
- Summary counts assistidos, investigations, treatments and Reiki recorded in the work window.
- Activity is grouped per assisted entity.
- `Usar agora` changes the current assisted context without modifying earlier records.
- As new work is recorded, the session summary updates.
- The `Investigações` action lists relevant completed/in-progress investigations.
- Incomplete investigation can be resumed after selecting its assisted entity.
- `Atendimento atual` remains visible during normal session navigation.
- `Modo atendimento` reduces nonessential context without hiding the current assisted entity or primary actions.
- Multiple assisted entities touched in the same session can be switched with quick chips.
- Active investigation / Reiki / reviewable treatment shortcuts open the expected current work.

## Quick input / one-touch workflow

- Duration presets write the canonical units `MINUTE`, `HOUR`, `DAY` or empty for `Sem prazo`.
- `30 min`, `1 h`, `1 dia`, `7 dias` and `Sem prazo` do not require manual unit correction.
- Finding classification can be selected with large touch chips and still updates the underlying form value.
- Reiki mode can be selected with large touch chips and still updates the underlying form value.
- Imbalance inputs offer 0/25/50/75/100% touch choices while still accepting any valid typed value from 0–100.
- Recent treatment-title suggestions are scoped to the current assisted entity.
- Selecting a previous Library resource may offer `Repetir última configuração`.
- Repeating a previous component copies command/duration into the current draft only; it never mutates the historical component.
- Optional therapeutic objective is stored separately from the treatment title and remains optional.

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
- Reports include session timing, assessments, investigations, confirmed findings, treatments/components, optional therapeutic objective and Reiki.
- `Resumo para compartilhar` exposes a shorter client-facing layer without replacing the internal record.
- Browser print works from the report window.
- Browser Save as PDF works on supported desktop/mobile browsers.
- Web Share appears only when supported by the browser.
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
- When enough final assessments exist, imbalance evolution renders with values in valid 0–100% range and chronological order.

## Universal search

- Search can find assisted entities, treatments, active Library resources and protocols.
- Search does not surface archived Library resources as active choices.
- Opening a search result navigates to the appropriate existing route/detail instead of creating duplicate data.
- Search remains usable with one hand on phone and with keyboard on iPad.

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
- Two treatments with the same visible title retain distinct `treatmentId` actions; final assessment never targets the wrong card.
- Optional therapeutic objective is visible on treatment cards/reports when filled and absent without placeholder noise when empty.

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
- Searchable Library picker remains practical with ~150 resources and prioritizes favorites / usage context.
- Library favorites can be toggled from both the Library cards and searchable picker.
- Favorite filtering does not modify resource records or snapshots.
- Bulk import accepts comma, semicolon and tab-separated files.
- Bulk import accepts pasted Excel/Numbers/Sheets data and one-resource-per-line lists.
- Bulk import preview distinguishes read/new/duplicate rows before saving.
- Duplicate active names are ignored case/diacritic-insensitively according to parser rules.
- Downloadable CSV template opens with Nome/Tipo/Finalidade/Observações columns.
- Exportar CSV writes all active resources back to the same round-trip format and excludes archived resources.
- CSV round-trip preserves commas/quotes in resource fields.
- Bulk import/export stays local to the device.
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
- UI-only favorites may remain device-local preferences and must never corrupt therapeutic state/imports.

## Install / offline

- Manifest exposes name `Fluxa`, Deep Teal theme, standalone display and the Fluxa icon.
- Add-to-Home-Screen / standalone launch does not change the local data namespace.
- First online load registers the scoped `/fluxa/` service worker without affecting the legacy root app.
- Service worker uses network first while connected, then caches current successful Fluxa responses.
- After at least one successful online load, going offline and reloading serves the cached Fluxa shell/assets.
- Offline state shows `Sem conexão · trabalhando com a cópia local do Fluxa`.
- Returning online removes the offline banner.
- Offline mode never claims to be cloud sync and does not suppress backup reminders.

## Therapist-facing language

- No-assistido context uses `Escolher quem será atendido` rather than a silent disabled control.
- Session action section reads `O que você deseja fazer agora?`.
- Investigation continuity uses `Retomar investigação`.
- Closing action reads `Revisar e encerrar`.
- Raw technical status/type enums do not leak into normal visible product copy.

## Mobile / one hand / iPad

- Primary controls have comfortable touch targets.
- Sim/Não remain large/stable.
- Reiki pause/resume/complete/cancel remain reachable without precision tapping.
- Session dashboard does not horizontally overflow at 320px.
- Custom protocol editor questions stack on narrow screens.
- Closing review/report buttons stack rather than overflow.
- Bottom navigation stays stable outside focused overlays.
- Deep Teal visual hierarchy remains legible in portrait/landscape.
- Search/favorite/resource picker controls remain reachable with the iOS keyboard open.
- When the virtual keyboard opens, bottom navigation yields space and sheets use the visible viewport height.
- Bottom sheets respect safe-area insets.
- Modo atendimento keeps the current context visible while reducing extra surface area.

## Accessibility

- Visible keyboard focus.
- Dialog has role=dialog, aria-modal and accessible title/fallback label.
- Focus enters new dialogs and remains trapped with Tab/Shift+Tab.
- Escape closes supported overlays and restores focus when possible.
- Close buttons/form controls expose accessible names.
- Guided preparation progress exposes status semantics.
- Reiki timers use role=timer with aria-live=off.
- Status is not color-only.
- Favorites have explicit accessible labels rather than relying on the star alone.
- Offline banner uses status semantics rather than color alone.
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
- `bulk-library.test.mjs`
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
- Assisted favorites, recent ordering and search with realistic data.
- Multiple investigations and exact resume behavior.
- Custom protocol creation/versioning/branching/resource snapshots.
- Closing review + internal/shareable reports with realistic populated states.
- Report print/save-PDF/share on iPhone/iPad.
- Bulk import/export using a real large spreadsheet/list of resources.
- Searchable Library resource picker with a realistically large Library.
- Preparation preference reuse across two real sessions.
- Safari/iPhone keyboard open/closed.
- Repeated background/foreground and reload during Reiki on a real device.
- iPad portrait/landscape and Modo atendimento.
- Add to Home Screen and standalone launch on the target device.
- Online-first load followed by airplane/offline reload and reconnect.
- VoiceOver/iOS navigation, favorites, offline banner and dialogs.
- Actual private-mode/localStorage quota failure behavior.
- Export → clear/import → restore on target browser.
- Full Deep Teal visual hierarchy pass with realistic data.

## Legacy isolation

- Root `/index.html` remains untouched.
- Fluxa remains under `/fluxa` until explicit publication decision.
- PR #2 remains Draft until automated checks are green and the manual mobile workflow is ready for validation.
