import { createStore } from './store.js';

const store = createStore();
let normalizing = false;

const UNIT_MS = Object.freeze({ MINUTE:60_000, HOUR:3_600_000, DAY:86_400_000, WEEK:604_800_000, MONTH:2_592_000_000 });

function graphDurationEnd(startedAt, value, unit = 'DAY') {
  const amount = Number(value);
  if (!startedAt || !Number.isFinite(amount) || amount <= 0) return null;
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return null;
  const multiplier = UNIT_MS[String(unit || 'DAY').toUpperCase()] || UNIT_MS.DAY;
  return new Date(start + amount * multiplier).toISOString();
}

function normalizePlannedGraphTiming() {
  if (normalizing) return;
  const state = store.getState();
  const ids = (state.treatmentComponents || []).filter((component) => {
    if (component.status !== 'PLANNED' || !Array.isArray(component.commands)) return false;
    return component.expectedEndAt || component.startedAt || component.commands.some((command) => (command.graphApplications || []).some((graph) => graph.startedAt || graph.expectedEndAt));
  }).map((component) => component.id);
  if (!ids.length) return;
  normalizing = true;
  try {
    store.setState((current) => {
      const draft = structuredClone(current);
      for (const component of draft.treatmentComponents || []) {
        if (!ids.includes(component.id)) continue;
        component.startedAt = null;
        component.expectedEndAt = null;
        for (const command of component.commands || []) {
          for (const graph of command.graphApplications || []) {
            graph.startedAt = null;
            graph.expectedEndAt = null;
          }
        }
        component.updatedAt = store.nowIso();
      }
      return draft;
    });
  } finally {
    normalizing = false;
  }
}

function anchorStartedTreatmentItems(treatmentId) {
  const state = store.getState();
  const treatment = (state.treatments || []).find((item) => item.id === treatmentId && item.status === 'IN_PROGRESS');
  if (!treatment?.startedAt) return;
  const targets = (state.treatmentComponents || []).filter((component) => component.treatmentId === treatmentId && component.status === 'IN_PROGRESS' && Array.isArray(component.commands));
  if (!targets.length) return;
  store.setState((current) => {
    const draft = structuredClone(current);
    for (const component of draft.treatmentComponents || []) {
      if (!targets.some((target) => target.id === component.id)) continue;
      const ends = [];
      component.startedAt = component.startedAt || treatment.startedAt;
      for (const command of component.commands || []) {
        for (const graph of command.graphApplications || []) {
          graph.startedAt = treatment.startedAt;
          graph.expectedEndAt = graph.noDuration ? null : graphDurationEnd(treatment.startedAt, graph.durationValue, graph.durationUnit);
          if (graph.expectedEndAt) ends.push(new Date(graph.expectedEndAt).getTime());
        }
      }
      component.expectedEndAt = ends.length ? new Date(Math.max(...ends)).toISOString() : null;
      component.updatedAt = store.nowIso();
    }
    return draft;
  });
}

store.subscribe(() => queueMicrotask(normalizePlannedGraphTiming));
queueMicrotask(normalizePlannedGraphTiming);

document.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-start-planned-treatment]');
  if (!button) return;
  const treatmentId = button.dataset.startPlannedTreatment;
  queueMicrotask(() => anchorStartedTreatmentItems(treatmentId));
}, false);
