# Fluxa MVP — regression checklist

Use this checklist before merging any vertical-slice increment. The MVP is local-only and the legacy root application must remain untouched.

## Session and preparation

- Starting from Hoje with no session creates exactly one OPEN session.
- Repeated taps on Iniciar sessão do not create a second OPEN session.
- Reload with an OPEN session restores the same session.
- Preparation progress survives reload.
- Session work actions are only presented after preparation is complete.
- Closing a session leaves active treatments untouched.
- Closing is blocked while a Reiki timer is running or paused.
- An unfinished investigation may remain open when the session closes.
- A session that appears forgotten open is never auto-closed.
- Forgotten-session UI offers Continue and Correct closing.
- Corrected closing stores actual `endedAt` separately from `closedRecordedAt`.
- Corrected closing cannot use a time before session start or in the future.

## Assisted context

- Every investigation, treatment, Reiki application and note carries an explicit assistedEntityId.
- Switching assisted context never mutates records already created for another assisted entity.
- Assisted history only contains events whose assistedEntityId matches the selected assisted entity.
- Person requires date of birth.
- Group requires at least one member and each member requires full name + birth date.
- Environment/property requires full address.
- Situation/process requires process identifier and captures involved/requesting person.
- PET accepts open descriptive details.
- Editing an assisted entity records `ASSISTED_UPDATED` without rewriting historical events.
- Assisted type is kept stable during MVP editing to avoid changing historical meaning.
- Archiving preserves history and removes the assisted entity from future-work lists.
- Archiving is blocked while treatment, investigation or Reiki work remains active.

## Investigation continuity

- Sim/Não answer is persisted immediately.
- Reload restores the same investigation and current question.
- Ending a session does not complete or discard an unfinished investigation.
- Opening a later session and resuming the investigation records INVESTIGATION_RESUMED.
- The original originSessionId remains unchanged.
- A positive answer does not become a Finding without explicit confirmation.
- Re-confirming findings does not duplicate an existing finding for the same investigation/question.

## Branching protocol engine

- Every execution stores its immutable protocol version snapshot.
- YES and NO follow only the configured next node.
- Invalid/missing next nodes fail explicitly instead of silently completing.
- End nodes complete the investigation without creating findings automatically.
- Confirmed findings preserve source node/question and selected classification.
- `Investigação inicial` and `Causa raiz` can be started only with an open, prepared session and selected assisted entity.

## Treatment lifecycle

- Treatment remains active after its origin session closes.
- Component expectedEndAt is derived from startedAt + duration.
- Passing expectedEndAt produces the derived “Revisão disponível” condition without changing Treatment.status.
- Interrupting records TREATMENT_INTERRUPTED and preserves the treatment/components.
- Retaking an interrupted treatment returns it to IN_PROGRESS and records TREATMENT_RESUMED.
- By default, interruption time is added to active component expectedEndAt so prescribed active duration is preserved.
- Adding a second/third component does not alter existing components.
- Stopping a component preserves it with STOPPED state and event history.
- Replacing a component creates a new component, preserves the original as REPLACED and records the replacement link.
- Each active component can be reviewed individually with the two pendulum decisions: 100% complete and permission to dismantle.
- A component is marked COMPLETED/dismantled only when both component-review decisions are positive.
- A negative/incomplete component review is retained without completing the component.
- Final assessment is unavailable until every component is COMPLETED, STOPPED or REPLACED.
- Final post-treatment assessment records frequency, imbalance %, need for a new treatment and when indicated.
- After component resolution + final assessment, the current Treatment becomes COMPLETED even when another future treatment is recommended.
- A new recommended cycle does not overwrite or reopen the completed treatment.

## Reiki

- Starting Reiki requires an OPEN session in the active timer flow.
- Timer duration is calculated from timestamps/intervals rather than an in-memory counter.
- Pause stops elapsed-time accumulation.
- Resume creates a new interval.
- Reload reconstructs the current elapsed duration.
- Completing Reiki records duration and notes and does not close the session.
- A completed Reiki application can be registered retrospectively without an open session.

## Local persistence

- Reload retains sessions, assistidos, investigations, findings, treatments, reviews, component reviews, assessments and Reiki.
- A failed primary JSON parse falls back to backup/recovery data when available.
- Recovery snapshot is written before the primary record on normal saves.
- Separate store instances in the same tab receive synchronized state updates.
- Autosave does not create logical duplicates on ordinary repeated UI actions.
- Storage health check detects inability to write to localStorage.
- Corrupt primary data with a valid backup exposes a recovery action.
- Recovery copies the valid backup/recovery candidate back to the primary record.
- User can export the current valid local dataset as JSON from Hoje.
- User can import a valid Fluxa JSON backup from Hoje.
- Import rejects unrelated/invalid JSON before touching current data.
- Import preserves the current valid primary dataset as backup before replacement.

## Mobile / one hand

- Primary controls have comfortable touch targets.
- Sim and Não remain at the bottom of the focused investigation screen.
- Reiki pause/resume/complete are reachable without precision tapping.
- Treatment component actions remain usable on narrow screens.
- Button rows stack on very narrow screens instead of overflowing.
- Bottom navigation remains stable outside focused sheets.
- No horizontal overflow at 320px CSS width.

## Accessibility

- Focus indication is visible for keyboard users.
- Focus is moved into newly opened dialogs.
- Escape closes the active dialog when a close action is available.
- Dialogs expose `role=dialog`, `aria-modal=true`, and an accessible title.
- Close buttons expose an accessible name instead of only “×”.
- Form fields receive labels/accessible names.
- Reiki live timer exposes timer semantics without announcing every second.
- Status is never communicated only by color.
- Forced-colors/high-contrast modes retain visible boundaries.
- Reduced-motion preference disables nonessential transition behavior.

## Automated regression

- `node fluxa/domain.test.mjs` covers core session/investigation/treatment/Reiki rules.
- `node fluxa/protocol-engine.test.mjs` covers branching and immutable protocol execution.
- `node fluxa/remaining.test.mjs` covers dismantling, assisted edit/archive and treatment completion.
- `node fluxa/storage-health.test.mjs` covers corruption recovery plus validated export/import behavior.
- `node fluxa/static-smoke.test.mjs` verifies that every local script/style referenced by `fluxa/index.html` exists and that the Fluxa shell does not regress to legacy branding.
- GitHub Actions workflow `Fluxa domain checks` runs all five test files for Fluxa branch changes/PRs.

## Manual validation still required before merge

- Test Safari on iPhone with keyboard open/closed and repeated background/foreground transitions.
- Test iPad portrait/landscape.
- Test localStorage quota/private-mode behavior on actual target browsers.
- Test export → clear/import → restore on a real iOS browser.
- Test screen reader navigation on at least VoiceOver/iOS.
- Confirm visual hierarchy against the approved Deep Teal mockups after all functional states are populated.

## Legacy isolation

- `/index.html` at repository root is not modified by Fluxa MVP work.
- New implementation remains under `/fluxa` until validation and an explicit decision to replace the legacy entry point.
