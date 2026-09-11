const CONTINUITY_ACTIONS = new Set([
  'TRIAGE',
  'FINDINGS',
  'REIKI_CONTEXT',
  'REIKI_ACTIVE',
  'TREATMENT_REVIEW',
  'TREATMENT_FINAL',
]);

export function isContinuityLocked(actionCode) {
  return CONTINUITY_ACTIONS.has(actionCode);
}
