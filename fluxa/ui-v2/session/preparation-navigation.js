import { getOpenSession, latestPreparation } from '../../domain.js';

export function stepBackPreparation(store) {
  const state = store.getState();
  const session = getOpenSession(state);
  if (!session) throw new Error('Não há uma sessão aberta para revisar a preparação.');
  const run = latestPreparation(state, session.id);
  if (!run || run.status === 'COMPLETED') return run || null;

  const steps = Array.isArray(run.steps) ? run.steps : [];
  const firstIncomplete = steps.findIndex((step) => !step.completed);
  if (firstIncomplete <= 0) return run;

  const previousKey = steps[firstIncomplete - 1]?.key;
  if (!previousKey) return run;

  store.setState((current) => {
    const draft = structuredClone(current);
    const target = draft.preparationRuns.find((item) => item.id === run.id && item.status !== 'COMPLETED');
    const previous = target?.steps?.find((step) => step.key === previousKey);
    if (!previous) return draft;
    previous.completed = false;
    previous.completedAt = null;
    return draft;
  });

  const nextState = store.getState();
  return latestPreparation(nextState, session.id);
}
