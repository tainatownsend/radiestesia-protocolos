import { isReikiEnabled } from './reiki-modality.js';
import { requirePreparedAssistedSessionState } from './session-rules.js';

export function requireSessionReikiStart(state, input = {}) {
  if (!isReikiEnabled(state)) throw new Error('Habilite Reiki nas terapias da prática antes de iniciar uma aplicação.');
  const session = requirePreparedAssistedSessionState(
    state,
    input.sessionId,
    input.assistedEntityId,
    'Selecione o Assistido correto antes de iniciar Reiki.'
  );
  return session;
}
