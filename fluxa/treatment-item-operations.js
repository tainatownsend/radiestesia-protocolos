import { addTreatmentComponent, replaceTreatmentComponent } from './backlog.js';
import { buildTreatmentItem, enrichComponentWithTreatmentItem } from './treatment-item-graphs.js';

function preflightStructuredItem(store, item, startedAt) {
  const state = store.getState();
  buildTreatmentItem(item, state.tools || [], startedAt);
}

export function addStructuredTreatmentComponent(store, input) {
  const startedAt = store.nowIso();
  preflightStructuredItem(store, input.item, startedAt);
  const component = addTreatmentComponent(store, {
    ...input.component,
    startedAt: input.component?.startedAt || startedAt
  });
  return enrichComponentWithTreatmentItem(store, component.id, input.item);
}

export function replaceStructuredTreatmentComponent(store, componentId, input) {
  const startedAt = store.nowIso();
  preflightStructuredItem(store, input.item, startedAt);
  const replacement = replaceTreatmentComponent(store, componentId, {
    ...input.component,
    startedAt: input.component?.startedAt || startedAt
  });
  return enrichComponentWithTreatmentItem(store, replacement.id, input.item);
}
