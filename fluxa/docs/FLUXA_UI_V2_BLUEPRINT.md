# Fluxa UI V2 — Experience & Architecture Blueprint

Status: **Implementation blueprint**  
Branch: `fluxa/ui-v2-blueprint`  
Strategy: **Preserve the core; rebuild the experience layer.**

## 1. Product North Star

Fluxa is not a collection of forms, cards, modals, or dashboards. It is the **conductor of a therapeutic session**.

At any moment during an active session, the user must be able to answer immediately:

1. **Who am I attending?**
2. **Where am I in the process?**
3. **What has already been completed?**
4. **What is still open?**
5. **What is the single best next action?**

Every UI element must help answer one of those questions or be removed from the primary surface.

## 2. Rebuild Decision

### Preserve

- `domain.js` and domain rules/invariants.
- `store.js`, schema/versioning, persistence, backup/recovery behavior.
- Hawkins measurement rules and same-session guards.
- Investigation/protocol engine and finding semantics.
- Treatment lifecycle, planning, components, reviews, final-assessment rules.
- Reiki lifecycle and Assistido binding rules.
- Session closing rules and history/event data.
- Existing domain and regression tests.
- Existing content/catalog/protocol data.

### Rebuild

- App shell and workspace navigation.
- Session cockpit/Home.
- Mobile sheets/modals.
- Preparation flow.
- Assistido picker/context surface.
- Hawkins presentation.
- Investigation/Triagem presentation.
- Findings handoff.
- Treatment composer.
- Treatment workspace/cards/review queue.
- Timeline/History presentation.
- Session closing/review/post-close summary.
- Settings/backup presentation.

### Retire progressively

Legacy UI enhancers, visual post-processors, CSS override layers, and MutationObservers that exist only to reshape already-rendered DOM.

## 3. Non-Negotiable Architecture Rules

### V2-R1 — Deterministic rendering

A V2 component must render its final visual structure directly from state. It must not depend on another script to transform, reorder, wrap, hide, relabel, or restyle its DOM after render.

### V2-R2 — No visual MutationObserver

`ui-v2` code may not use `MutationObserver` to make a component visually correct. Mutation observation is allowed only for narrowly documented platform/integration cases, never as a render mechanism.

### V2-R3 — One render owner per surface

Each surface has one owner. For example, `PreparationFlow` owns preparation markup; no second module may post-process it.

### V2-R4 — One scroll owner

A page/sheet must have one intentional scrolling container. No accidental nested scrolling.

### V2-R5 — One primary action

Each state may expose many operations, but only one action may be visually dominant.

### V2-R6 — Maximum depth

Primary interaction depth is limited to:

`surface -> section -> control`

Maximum two visible card levels. Avoid card-inside-card-inside-card layouts.

### V2-R7 — Context is persistent

During active work, Assistido + current workflow location remain visible without requiring navigation back.

### V2-R8 — Safe-area is structural

Safe-area, visual viewport, keyboard avoidance, sticky headers and sticky footers are responsibilities of the structural component (`MobileSheet` / `AppShell`), never ad-hoc screen patches.

### V2-R9 — Domain guards remain authoritative

The UI may predict prerequisites and explain them before a click, but it may never bypass or duplicate authoritative domain validation.

### V2-R10 — No full page reload for normal workflow

Session, treatment, investigation, review, settings, and navigation state changes must not require `location.reload()`.

## 4. Proposed V2 Structure

```text
fluxa/
  domain.js                 # existing authoritative core
  store.js                  # existing authoritative state/persistence
  ...existing core modules

  ui-v2/
    index.js
    app-shell.js
    router.js
    selectors.js
    actions.js
    tokens.css
    base.css

    components/
      app-header.js
      workspace-nav.js
      mobile-sheet.js
      sticky-footer.js
      step-progress.js
      status-line.js
      empty-state.js
      inline-message.js
      toast-region.js
      overflow-menu.js

    session/
      session-cockpit.js
      session-start.js
      preparation-flow.js
      assisted-picker.js
      hawkins-panel.js
      session-closing.js
      post-close-summary.js

    investigation/
      investigation-entry.js
      triage-flow.js
      findings-summary.js

    treatment/
      treatment-composer.js
      treatment-list.js
      treatment-card.js
      treatment-workspace.js
      treatment-review.js
      final-assessment.js

    reiki/
      reiki-entry.js
      reiki-workspace.js

    history/
      history-page.js
      timeline-group.js
      audit-details.js

    acervo/
      acervo-page.js
      acervo-search.js

    settings/
      settings-page.js
      backup-panel.js

    testing/
      fixtures.js
      state-matrix.js
      layout-contracts.js
```

The exact file boundaries may evolve, but ownership rules may not.

## 5. Workspace Information Architecture

Primary workspace:

- **Hoje** — current session and next action.
- **Tratamentos** — longitudinal treatment work/review queue.
- **Histórico** — narrative history + secondary audit detail.
- **Acervo** — Assistidos, Protocolos, Gráficos/Recursos, Terapias.

Settings remains a global utility, not a primary workflow destination.

### Open-session behavior

If a session is open, launching Fluxa prioritizes the session cockpit. The user may navigate elsewhere, but returning to Hoje restores session context rather than generic Home state.

## 6. Golden Path

```text
OPEN FLUXA
  -> open session exists?
       no  -> Start session
       yes -> Resume session cockpit
  -> Preparation
  -> Select Assistido
  -> Hawkins baseline
  -> Next action
       -> Investigate
       -> Treat
       -> Reiki
  -> Result / state update
  -> Next action
  -> Safe close
  -> Session summary
```

This path is the first V2 implementation gate. Secondary functionality is not migrated until this path is excellent on a real iPhone.

## 7. Session Cockpit Contract

The cockpit is action-first, not dashboard-first.

Order:

1. Session/Assistido context.
2. **Next action recommendation**.
3. Prerequisite state when relevant.
4. Compact operational indicators.
5. Secondary actions.
6. Optional recent session activity.

### Recommendation priority

The recommendation selector must resolve the highest-value actionable state, including at minimum:

1. Blocking prerequisite (Preparation / Assistido / Hawkins).
2. Treatment ready for final assessment.
3. Treatment/component review due or manually reviewable.
4. Open investigation to resume.
5. Active treatment to continue/review.
6. Findings awaiting handoff.
7. General Investigate / Treat / Reiki actions.

A sticky filter elsewhere in the product may never hide the object referenced by the cockpit recommendation.

## 8. MobileSheet Contract

`MobileSheet` is the single modal/sheet primitive for V2 workflows.

```text
MobileSheet
  Header (fixed/sticky)
    Eyebrow / context
    Title
    Close

  Body (only scroll owner)
    Workflow content

  Footer (optional sticky)
    Secondary action
    Primary action
```

### Mandatory behavior

- `role="dialog"` + `aria-modal="true"` where modal.
- Correct focus entry, focus containment, Escape close when safe, focus return.
- `100dvh`/`visualViewport` awareness.
- iOS safe-area support.
- Keyboard never covers active input or primary CTA.
- Footer occupies layout space; it never overlays the last body content.
- Background scroll and interaction locked while modal.
- No modal inside modal for the normal golden path.
- Only one visible primary CTA.

## 9. Preparation V2

Preparation is a guided four-checkpoint flow, not a long form.

Canonical steps derive from existing preparation semantics:

1. Respiração e presença.
2. Frequência do terapeuta.
3. Proteção.
4. Permissão.

### Final-step target

Example:

```text
Preparação · 4 de 4

Frequência do terapeuta
540 Hz · Alegria                         Alterar
✓ Adequada para continuar

Proteção
4 Círculos                              Alterar

Permissão
Confirmada                              Alterar

[ Concluir preparação ]
```

### Deduplication rule

One concept appears once in the primary scan path. Detailed explanation is conditional or expandable.

Example: when frequency is valid, do not repeat `540 Hz · Alegria` in a second card. When invalid, show the blocking explanation because it is actionable.

## 10. Assistido Contract

During active session work:

- Current Assistido is visible in the workflow header/context line.
- Changing Assistido explains consequences for currently open work.
- Recent Assistidos are prioritized.
- Search is immediate.
- Creating a new Assistido is a short progressive flow.
- Domain remains authoritative for type-specific required fields.

## 11. Hawkins Contract

- Hawkins prerequisite is visible **before** gated work is attempted.
- Initial and final measurements are clearly distinguished.
- Scale/unit presentation is consistent.
- Valid same-session measurement is reused rather than requested redundantly.
- Invalid entry feedback is inline.
- Success state is compact (`540 Hz · Alegria`, `Adequada para continuar`).
- Blocking explanation is shown only when relevant.

## 12. Investigation / Triagem Contract

The quick triage should feel like answering a short guided conversation.

Each question state includes:

- Assistido context.
- Protocol name.
- `Pergunta N de total`.
- One question.
- Back/correct action.
- Binary answer footer.
- Autosave state, quiet and stable.

No large blank region is allowed. No question screen may require hunting for Sim/Não.

After completion, transition directly to a findings summary rather than a generic success state.

## 13. Findings Contract

The user must immediately understand what happens next.

- Findings are selectable individually.
- Source/provenance is secondary metadata.
- Multiple findings may be selected.
- Primary action: create/compose treatment from selected findings when appropriate.
- Already-handled findings have a visible longitudinal state to avoid duplicate work.

## 14. Treatment Composer Contract

Progressive composer:

1. **Context** — treatment name + optional objective.
2. **Composition** — Radiestesia baseline + optional additional modalities.
3. **Items** — item -> command -> graph semantics rendered flat/progressive, not as deeply nested cards.
4. **Review** — compact summary for complex treatment.

Footer:

- Secondary: `Salvar como planejado`.
- Primary: `Iniciar tratamento`.

Each item can collapse to a summary such as `2 comandos · 3 gráficos`.

The UI explains the difference between planned and started treatment before save/start, while the existing domain guards remain authoritative.

## 15. Treatment Workspace Contract

Treatment cards behave like a work queue.

Primary action depends on state:

- Planned -> `Iniciar` or prerequisite action.
- Active -> `Revisar` / `Continuar` as appropriate.
- Final-ready -> `Realizar avaliação final`.

Secondary hierarchy:

- `Ver componentes`.
- `Histórico`.
- Overflow: edit/interromper/administrative operations.

Always expose progress such as `2 de 3 componentes resolvidos` where meaningful.

Components without an automatic deadline remain manually reviewable; they must not disappear from the work queue.

## 16. Reiki Contract

Reiki is a first-class session action when enabled.

- Visible from cockpit.
- Current Assistido context is explicit.
- Running/paused state is visible.
- Session cannot close while a Reiki application remains in a domain-blocking active state.
- Outside-session behavior remains supported by the existing lifecycle rules.

## 17. History / Timeline Contract

Primary history is human-readable narrative; audit detail is secondary.

Example primary event:

```text
Tratamento Ansiedade revisado
2 de 3 componentes resolvidos
14:32
+ 4 atividades relacionadas
```

`Atividade registrada` is not acceptable when enough data exists to name the activity.

Related low-level events remain accessible through expandable audit detail, preserving traceability without overwhelming the main timeline.

## 18. Session Closing Contract

Before close, show:

- Assistido(s) worked with.
- Investigations opened/completed.
- Treatments worked with.
- Notes/findings requiring awareness.
- Active Reiki blocking state if any.
- Longitudinal work that will remain active after session closes.

After successful close, show a session summary rather than silently returning to generic Home.

## 19. Local-First Trust Contract

Settings must make persistence truthful and understandable.

- State that data is stored locally on this device/browser unless/until another persistence model exists.
- Show last successful backup/export time.
- Make export easy to find.
- Import must preview/validate before replacing current data.
- Never imply cloud sync when none exists.

## 20. Design System Constraints

### Spacing

`4 / 8 / 12 / 16 / 24 / 32`

### Touch targets

- Minimum interactive target: 44 px.
- Normal control target: 48–52 px.
- Main CTA: 56 px.

### Shape

- Two card radius levels maximum.
- One modal/sheet radius family.
- Avoid border-heavy separation; prefer spacing and surface hierarchy.

### Typography

- Fluid page/modal title scale.
- One eyebrow scale.
- Controlled text measure for explanatory copy.
- No helper paragraph should dominate the action it explains.

### Color

- Theme tokens remain the only color authority.
- Component CSS consumes semantic tokens; no screen-specific legacy palette overrides.
- Status is never communicated by color alone.

## 21. Rendering & Layout Stability Requirements

The V2 must be measurable, not merely visually judged.

### Automated contract

For deterministic state fixtures, after initial settle:

- No primary layout element may unexpectedly change bounding box without state/user interaction.
- No essential CTA may overlap body content.
- No essential control may fall outside the visual viewport.
- No more than one sticky footer per active surface.
- No nested scroll owner in the golden path.
- No duplicate primary action labels for the same operation in one scan path.

### Target viewport matrix

At minimum:

- 375 x 812 — small iPhone class.
- 393 x 852 — current standard iPhone class.
- 430 x 932 — large iPhone class.
- Tablet portrait.
- Desktop.

Physical-device acceptance remains required for keyboard/safe-area feel and perceived motion.

## 22. Accessibility Requirements

- Semantic controls; no click-only generic divs.
- Visible `:focus-visible`.
- Focus containment and return for modal workflows.
- `prefers-reduced-motion` support.
- 44 px minimum touch targets.
- Accessible names for icon/overflow controls.
- State not encoded by color only.
- Dynamic type / larger font sanity checks on iOS.

## 23. State Fixture Matrix

V2 visual QA must be reproducible. Build fixtures for at least:

1. No session.
2. Session open / preparation not started.
3. Preparation 1/4.
4. Preparation 4/4 valid.
5. Preparation with invalid therapist frequency.
6. Prepared / no Assistido.
7. Assistido selected / no Hawkins baseline.
8. Hawkins valid.
9. Triagem 1/3.
10. Triagem 3/3.
11. Findings available.
12. New treatment composer empty.
13. Composer with multiple items/commands/graphs.
14. Planned treatment blocked by prerequisite.
15. Active treatment.
16. Treatment ready for review.
17. Component without deadline/manual review.
18. Treatment ready for final assessment.
19. Final assessment.
20. Reiki running.
21. Safe-close review.
22. Post-close summary.
23. History with grouped related activity.
24. Empty/history/acervo states.

## 24. Migration Plan

### Phase 1 — Blueprint and contracts

Deliverables:

- This document.
- `ui-v2` ownership rules.
- Component contracts.
- State fixture matrix.
- Cutover criteria.

No production cutover.

### Phase 2 — Structural skeleton

Build only:

- V2 AppShell.
- Workspace navigation.
- MobileSheet.
- StickyFooter.
- StepProgress.
- SessionCockpit shell.
- State selectors/action adapters.

Gate: prove stable rendering and mobile mechanics before feature migration.

### Phase 3 — Golden path

Implement:

`Start session -> Preparation -> Assistido -> Hawkins -> Triagem -> Findings -> Treatment -> Close`

Gate: physical iPhone acceptance.

### Phase 4 — Functional parity

Migrate:

- Planned treatments.
- Treatment review/final assessment.
- Reiki.
- Longitudinal treatment continuation.
- History.
- Acervo.
- Settings/backup.

### Phase 5 — Cutover

- Existing domain/regression suite green.
- New V2 structural/layout tests green.
- Visual regression approved.
- iPhone pass approved.
- iPad/desktop smoke approved.
- Promote V2 entrypoint.
- Freeze legacy UI.
- Remove legacy enhancers/CSS progressively after data/feature parity confidence.

## 25. Legacy Freeze Rule

From the start of Phase 2:

- Do not add another general-purpose visual hardening stylesheet to legacy UI.
- Do not add another DOM enhancer to fix V2 behavior.
- Legacy P0 safety bugs may still be fixed, but V2 is the destination for UX work.
- New user-facing features should be evaluated for V2-first implementation.

## 26. Cutover Acceptance Criteria

V2 may replace the current presentation layer only when all are true:

1. Existing authoritative domain tests remain green.
2. Golden path works without legacy visual enhancers.
3. No known P0 layout instability on supported iPhone sizes.
4. Keyboard does not cover active input or primary CTA.
5. No sticky footer covers final body content.
6. Every active-session screen exposes Assistido context where relevant.
7. Every active-session screen has one clear next action.
8. No known duplicated operational information in the primary scan path.
9. Treatment continuity across sessions remains intact.
10. Safe close and Reiki blocking behavior remain intact.
11. Backup/import/export behavior remains truthful and functional.
12. Physical-device acceptance is complete.

## 27. Implementation Order

Do not build screen-by-screen in arbitrary order. Build reusable structure first:

1. Selectors/action adapters.
2. Tokens/base reset.
3. AppShell.
4. MobileSheet + StickyFooter.
5. SessionCockpit.
6. PreparationFlow.
7. AssistedPicker.
8. HawkinsPanel.
9. TriageFlow.
10. FindingsSummary.
11. TreatmentComposer.
12. TreatmentWorkspace.
13. ReikiWorkspace.
14. SessionClosing.
15. History.
16. Acervo.
17. Settings/backup.
18. Cutover/deprecation.

## 28. Definition of Done for Each V2 Surface

A surface is not done because it looks correct in one screenshot. It is done only when:

- State behavior is deterministic.
- Domain errors are surfaced inline/actionably.
- No post-render visual mutation is required.
- Small/standard/large iPhone viewport contracts pass.
- Keyboard/safe-area behavior is defined.
- Loading/empty/error/blocked/success states are covered where relevant.
- One primary action is obvious.
- Assistido/workflow context is preserved.
- Relevant accessibility checks pass.
- Regression fixture exists.

---

**North Star implementation test:** if a user pauses anywhere during an active session, Fluxa should make the answer to “what do I do next?” obvious without requiring them to remember where they came from or search the interface.
