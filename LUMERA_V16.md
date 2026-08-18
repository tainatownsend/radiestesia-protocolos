# Lumera v1.6 — Quality, stability and architecture

## Scope

Lumera v1.6 is a quality/stability layer over the consolidated v1.4/v1.5 product. The first priority is to keep existing user data and workflows working while reducing interaction and translation regressions.

## Stability fix

The v1.3 compatibility translator previously observed all child-list mutations and rewrote footer/option text even when the value had not changed. That could continuously create new DOM mutations and repeatedly traverse the page, especially in English mode. v1.6 makes these writes idempotent: DOM text, options, placeholders, aria labels and the footer are changed only when the resulting value is actually different.

The v1.6 Home uses delegated document-level actions rather than attaching fragile handlers to dashboard buttons after every render. Main actions resolve the already-established native entry points (`startAssessmentBtn`, `openDivorceBtn`, `historyBtn` and existing protocol cards), with a short readiness wait and an aria-live fallback message if a dynamically loaded module is not ready yet.

## Architecture direction

### UI shell
- `lumera-v16.js`
- `lumera-v16.css`
- Owns the visible Home dashboard, Protocol Library, focus/session mode and global accessibility enhancements.
- The v1.4 dashboard remains loaded for backwards compatibility but is visually superseded by the v1.6 shell.

### i18n
- `lumera-i18n-v16.js`
- Introduces a keyed PT/EN dictionary (`LumeraI18n.t`) for the v1.6 shell and establishes the target native i18n API.
- The existing v1.3 translator remains as a compatibility layer for legacy protocol/question/command content that has not yet been migrated into explicit bilingual source data.
- New UI should use translation keys rather than DOM translation.

### Session / practitioner journey
- `lumera-workspace.js`
- Preparation and end-of-day closing remain practitioner-work-period concepts rather than per-analysis steps.

### Assessment
- `initial-assessment.js`
- `initial-assessment-details.js`
- Assessment persistence remains in `rt_assessments_v1`; no destructive migration is introduced by v1.6.

### Protocol engine/data
- `controller-v4.js` is the active protocol controller.
- `controller-v3.js` remains a legacy source file and is not loaded by the current page.
- `controller-v3.css` is intentionally retained because v4 still reuses shared structural styles (duration/causal/history classes).
- Protocol data remain split across the existing data files for compatibility.

### Reports and records
- `lumera-v15.js` / `lumera-v15.css`
- v1.5 remains responsible for Clients & History and enhanced report summaries.

### Divórcio Energético
- `divorce-energy.js` / `divorce-energy.css`
- Kept as a separate guided workflow with its existing storage.

## Accessibility / mobile quality

v1.6 adds or reinforces:
- delegated touch-safe actions for the Home dashboard;
- minimum large action surfaces for iPhone/iPad;
- visible keyboard focus on primary v1.6 controls;
- semantic dialog labelling for the protocol library;
- `aria-pressed` state for library filters and Session Mode;
- an aria-live status region for delayed/unavailable modules;
- automatic `type="button"` protection for buttons that otherwise risk implicit submit behavior;
- fallback aria labels for otherwise-unlabelled controls when a nearby label can be inferred;
- Escape-to-close for the protocol library;
- reduced-motion handling;
- a single v1.6 Session Mode control (the older v1.4 control is hidden under v1.6).

## Regression checklist reviewed

- Home → New assessment
- Home → Protocol Library → deep protocol
- Home → Protocol Library → quick protocol
- Home → Energetic Divorce
- Home → Clients & History
- Practitioner preparation → multiple analyses/treatments → end-of-day closing
- Interrupted assessment → resume
- Interrupted protocol investigation → resume compatibility
- Protocol investigation → causal review → treatment → report
- Assessment-linked protocol → reassessment → report
- PT → EN → PT shell redraw and legacy compatibility translation
- Mobile/iPad responsive dashboard and modal library

## Remaining limitations

1. Legacy protocol/question/command English content is still partially produced by the v1.3 compatibility translator. The v1.6 keyed i18n API is now the target architecture, but full editorial migration of every protocol string into explicit `{pt, en}` source values remains a separate content-migration task.
2. Protocol drafts persist the investigation answer sequence, but later causal-review/treatment state is not yet persisted as a first-class session-engine state machine.
3. A physical Safari/iPhone/iPad runtime is still required for final device-specific visual QA; v1.6 addresses structural event, accessibility and responsive issues in code but cannot emulate every Safari behavior from the repository environment.
4. Older source files are intentionally not deleted in this release. Removal should happen only after a browser/device regression pass confirms that no shared styles or migration paths depend on them.
