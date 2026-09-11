# Fluxa UI V2 — Physical iPhone Acceptance Gate

Status: **Required before PR #254 merge or `/fluxa/` production cutover**  
Target: `fluxa/ui-v2-mobile-viewport-hardening`  
Live entrypoint: `/fluxa/v2.html?mode=live`

This checklist converts the V2 blueprint's physical-device acceptance criteria into one reproducible smoke test. A desktop/fixture pass is not a substitute for this gate.

## 1. Preconditions

- Use the current PR #254 head.
- Do not test the fixture URL as the live experience. The live URL must include `?mode=live`.
- Preferred local path: start a static server from the repository root so `/fluxa/v2.html` resolves correctly.
- Founder-authorized remote path (10/09/2026): a temporary Vercel Preview of the exact PR head may be used solely for physical-iPhone acceptance. This does not authorize production deployment, merge, or `/fluxa/` cutover.
- Keep the iPhone and development computer on the same local network when testing through the computer; this is not required when using the founder-authorized Vercel Preview.
- Use Safari on iPhone for the primary pass. A second browser is optional.
- Export a backup before testing with any local data that must be preserved.
- Record iPhone model, iOS version, browser, orientation, and PR head SHA in the result template below.

### Local URLs

Desktop smoke:

```text
http://localhost:5500/fluxa/v2.html?mode=live
```

iPhone on the same network:

```text
http://<COMPUTER-LAN-IP>:5500/fluxa/v2.html?mode=live
```

The static server must listen on the LAN interface for the iPhone URL to work. If port `5500` is unavailable, another local port is fine as long as both URLs use the same port.

## 2. Pass / fail rule

The physical gate is **PASS** only when every P0 item below passes on the real iPhone.

A P0 failure includes:

- active input or primary CTA hidden by the keyboard;
- sheet footer covering body content;
- page/sheet that cannot be scrolled to all required controls;
- background scrolling while a modal sheet is active;
- horizontal overflow that hides content or actions;
- visible layout jumping/tremor during normal interaction;
- safe-area collision with the notch, Dynamic Island, home indicator, or browser chrome;
- lost workflow context or inability to return to the correct next action;
- duplicate submission/navigation caused by Return/Enter;
- focus unexpectedly opening the keyboard when a sheet first appears;
- a blocking workflow that can be bypassed through another surface;
- data replacement/import becoming available while an active session is open.

Any P0 failure keeps PR #254 unmerged and blocks production cutover. A temporary preview used only for acceptance may remain available.

## 3. Cold-load and shell check

Open the live URL with no sheet open.

- [ ] No horizontal page scroll.
- [ ] Header and primary navigation fit without clipping.
- [ ] Bottom navigation / lower controls clear the iPhone home indicator.
- [ ] No visible tremor or repeated re-layout after the first paint.
- [ ] Switching between Hoje, Tratamentos, Histórico and Acervo does not jump unexpectedly.
- [ ] Returning to Hoje restores the active session context when one exists.

## 4. Start session and Preparation

From Hoje, start a new session and complete Preparation.

For each sheet state:

- [ ] Sheet opens with its header fully visible below the top safe area.
- [ ] Opening the sheet does **not** summon the keyboard automatically.
- [ ] Background content does not scroll while the sheet is open.
- [ ] Sheet body is the single intentional scroll owner.
- [ ] Sticky footer remains reachable and never overlays the last body content.

Preparation-specific:

- [ ] Step position is obvious.
- [ ] Previous step can be revisited without erasing already entered values.
- [ ] Frequency input remains visible when the keyboard opens.
- [ ] Protection input remains visible when the keyboard opens.
- [ ] Permission input remains visible when the keyboard opens.
- [ ] Primary CTA remains reachable with the keyboard open.
- [ ] Closing and reopening the keyboard does not leave a blank gap or wrong sheet height.
- [ ] No step transition visibly shakes the page or footer.

## 5. Select or create Assistido

Use both search and the quick person-creation flow.

- [ ] Search field remains visible above the keyboard.
- [ ] Long Assistido lists scroll inside the sheet without moving the background page.
- [ ] Search works with accented and unaccented names.
- [ ] Empty search state is understandable and does not shift the footer over content.
- [ ] `Adicionar nova pessoa` clearly describes the current quick-create capability.
- [ ] Name and birth date are visibly/semantically required.
- [ ] Native validation or Fluxa validation prevents an empty person record.
- [ ] After creation, the new person becomes the current session Assistido.
- [ ] Current Assistido remains obvious after the sheet closes.

## 6. Hawkins baseline

- [ ] The sheet identifies the current Assistido once, without duplicate context.
- [ ] Numeric keyboard does not cover the Hawkins input or primary CTA.
- [ ] Invalid/empty input produces actionable feedback without navigation loss.
- [ ] Successful baseline returns to Hoje without visible double-render/tremor.
- [ ] Returning to the same Assistido in the same session reuses the existing valid baseline rather than requesting it again.

## 7. Investigation / Triagem

Run the complete quick investigation and use Back at least once.

- [ ] `Pergunta N de total` remains visible.
- [ ] Sim/Não actions are immediately reachable; there is no large dead region.
- [ ] Back corrects the previous answer without losing the investigation.
- [ ] Each answer advances once only.
- [ ] Fast repeated taps do not create a visible double transition.
- [ ] The sheet height/footer remains stable from first to last question.
- [ ] Completion hands off directly to findings.

## 8. Findings -> Treatment Composer

Confirm at least one finding and create a treatment containing multiple items, commands, and graphs.

- [ ] Findings can be selected/deselected without losing context.
- [ ] Treatment name, item, command and graph inputs expose required semantics.
- [ ] Long composer content scrolls completely above the sticky footer.
- [ ] Only one treatment item needs to be expanded at a time.
- [ ] Adding/removing an item, command, or graph does not jump to the top unexpectedly.
- [ ] Keyboard never covers the currently edited field.
- [ ] `Salvar como planejado` and `Iniciar tratamento` remain visually distinct.
- [ ] The footer never covers the final summary or final graph row.
- [ ] Names containing `&` display normally, not as `&amp;` text.

## 9. Treatment queue, review and final assessment

Exercise a planned treatment, an active treatment, component review, and final assessment where available.

- [ ] Empty composition never displays `0/0`; it displays an accessible `—` state.
- [ ] A continuity lock makes competing treatment mutations read-only while still allowing consultation.
- [ ] The recommended treatment action is visually dominant only once.
- [ ] Workspace content can be fully scrolled on iPhone.
- [ ] Review controls remain reachable with keyboard open when notes are edited.
- [ ] Final Hawkins and imbalance fields are required.
- [ ] When `Precisa de um novo tratamento` is checked, follow-up timing is required and understandable.
- [ ] Completing the final assessment returns to the expected workflow context without tremor.

## 10. Reiki

Start Reiki for the current Assistido and leave it running long enough to observe the timer.

- [ ] Timer advances without the whole sheet/page visibly rerendering each second.
- [ ] No one-second tremor or scroll-position drift is visible.
- [ ] Assistido appears in the sheet header and application mode appears in the timer without duplicate context.
- [ ] Pause works once and changes the available action to Resume.
- [ ] Resume works once.
- [ ] Session closing is blocked while Reiki remains active.
- [ ] `Abrir Reiki para concluir` opens the correct Reiki context; it does not imply instant completion.
- [ ] Completing Reiki releases the close blocker.

Optional recovery scenario when test data supports it:

- [ ] Outside-session Reiki remains controllable without stealing the current session's next action.
- [ ] A stale session-bound Reiki record offers recovery/closure of the pending record rather than normal therapeutic resume.

## 11. Multi-Assistido continuity and safe close

If practical, work with two Assistidos during the same session.

- [ ] Changing Assistido resets the visible route to Hoje rather than leaving stale content from another section.
- [ ] Existing same-session Hawkins is reused for an Assistido already calibrated.
- [ ] A pending investigation/finding for another Assistido blocks closing.
- [ ] The close sheet identifies which Assistido must be resumed.
- [ ] Recovery action returns to the correct Assistido and correct next workflow action.
- [ ] Closing note is hidden while a blocker exists.
- [ ] Closing note appears only when the session is actually ready to close.
- [ ] Successful close produces the post-close summary instead of silently returning to a generic home state.

## 12. Histórico, Acervo and Settings

After the session is closed:

- [ ] History timeline remains readable and scrollable on the iPhone.
- [ ] History detail reads as a narrative: compact summary, continuity, note, then timeline — not a KPI dashboard.
- [ ] Raw enum values such as `IN_PROGRESS`, `PLANNED` or `PET` are not exposed as primary UI labels.
- [ ] Person birth dates render in `dd/mm/yyyy` format.
- [ ] Non-person Assistidos do not show misleading `missing birth date` copy.
- [ ] Acervo home categories read as compact navigation rows, not four large dashboard cards.
- [ ] The populated Acervo remains scannable without unnecessary nested card layers.
- [ ] Acervo search can be used with the keyboard without hiding results/footer.
- [ ] Settings correctly says data is local to this browser/device.
- [ ] Settings sections remain visually flat and separated; storage/import states do not create card-on-card nesting.
- [ ] Export remains available.
- [ ] During an open session, import/recovery is visibly disabled.
- [ ] After the session closes, import can be selected and previewed before replacement.

## 13. Safe-area and viewport stress checks

Repeat at least one long sheet (Treatment Composer or Settings) under these conditions:

- [ ] Portrait, keyboard closed.
- [ ] Portrait, keyboard open.
- [ ] Scroll to the very bottom with keyboard open.
- [ ] Close keyboard while scrolled near the bottom.
- [ ] Reopen keyboard on a lower field.
- [ ] Rotate to landscape and back to portrait if orientation change is supported in the test environment.
- [ ] Increase iOS text size one step and confirm controls remain usable.

No state above may leave an unreachable CTA, clipped field, persistent blank gap, nested scroll trap, or overlay collision.

## 14. Perceived-stability test

This is intentionally subjective but binary.

Perform the following slowly, then quickly:

1. Open/close Preparation.
2. Focus/blur a text field three times.
3. Advance three Triagem questions.
4. Add two treatment items.
5. Expand/collapse treatment items.
6. Open/close Reiki.
7. Navigate Hoje -> Tratamentos -> Hoje.

- [ ] No repeated shake, flash, scroll reset, footer bounce, or one-frame incorrect layout is perceptible.

If any motion looks wrong, record a screen recording before changing state further.

## 15. Result template

Copy this block into the validation result:

```text
FLUXA V2 PHYSICAL IPHONE ACCEPTANCE

PR head SHA:
iPhone model:
iOS version:
Browser/version:
Date:
Tester:

Cold load / shell: PASS | FAIL
Preparation + keyboard: PASS | FAIL
Assistido: PASS | FAIL
Hawkins: PASS | FAIL
Triagem: PASS | FAIL
Findings + composer: PASS | FAIL
Treatment review/final: PASS | FAIL
Reiki: PASS | FAIL
Multi-Assistido + close: PASS | FAIL
History / Acervo / Settings: PASS | FAIL
Safe-area / viewport stress: PASS | FAIL
Perceived stability: PASS | FAIL

P0 failures:
- none | describe each failure

Non-blocking observations:
- none | describe each observation

Screen recordings / screenshots:
- none | filenames/links

FINAL GATE: PASS | FAIL
```

## 16. Release decision

**PASS** means the physical-iPhone requirement in the V2 blueprint is satisfied for this PR head. It does not itself deploy or merge anything.

**FAIL** means keep PR #254 open, preserve V2 isolation at `/fluxa/v2.html`, fix the failures, rerun automated CI, then repeat only the affected physical scenarios plus the perceived-stability test.

No production Vercel deployment, `/fluxa/` cutover, or PR #254 merge is authorized by this checklist alone. A temporary preview deployment is permitted only for founder-authorized physical-device acceptance.
