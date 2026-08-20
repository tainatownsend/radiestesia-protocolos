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

## Assisted context

- Every investigation, treatment, Reiki application and note carries an explicit assistedEntityId.
- Switching assisted context never mutates records already created for another assisted entity.
- Assisted history only contains events whose assistedEntityId matches the selected assisted entity.

## Investigation continuity

- Sim/Não answer is persisted immediately.
- Reload restores the same investigation and current question.
- Ending a session does not complete or discard an unfinished investigation.
- Opening a later session and resuming the investigation records INVESTIGATION_RESUMED.
- The original originSessionId remains unchanged.
- A positive answer does not become a Finding without explicit confirmation.
- Re-confirming findings does not duplicate an existing finding for the same investigation/question.

## Treatment lifecycle

- Treatment remains active after its origin session closes.
- Component expectedEndAt is derived from startedAt + duration.
- Passing expectedEndAt produces the derived “Revisão disponível” condition without changing Treatment.status.
- Interrupting records TREATMENT_INTERRUPTED and preserves the treatment/components.
- Retaking an interrupted treatment returns it to IN_PROGRESS and records TREATMENT_RESUMED.
- A review that uses a new measurement requires an OPEN session.
- Completing a review can complete components and treatment while retaining previous events/reviews.

## Reiki

- Starting Reiki requires an OPEN session in the active timer flow.
- Timer duration is calculated from timestamps/intervals rather than an in-memory counter.
- Pause stops elapsed-time accumulation.
- Resume creates a new interval.
- Reload reconstructs the current elapsed duration.
- Completing Reiki records duration and notes and does not close the session.
- A completed Reiki application can be registered retrospectively without an open session.

## Local persistence

- Reload retains sessions, assistidos, investigations, findings, treatments, reviews and Reiki.
- A failed primary JSON parse falls back to the last-known backup when available.
- Autosave does not create logical duplicates on ordinary repeated UI actions.

## Mobile / one hand

- Primary controls have comfortable touch targets.
- Sim and Não remain at the bottom of the focused investigation screen.
- Reiki pause/resume/complete are reachable without precision tapping.
- Bottom navigation remains stable outside focused sheets.
- No horizontal overflow at 320px CSS width.

## Legacy isolation

- `/index.html` at repository root is not modified by Fluxa MVP work.
- New implementation remains under `/fluxa` until validation and an explicit decision to replace the legacy entry point.
