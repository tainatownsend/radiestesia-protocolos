export function requireOpenSessionState(state, sessionId, message = 'Esta ação exige uma sessão aberta.') {
  const session = (state.sessions || []).find((item) => item.id === sessionId && item.status === 'OPEN');
  if (!session) throw new Error(message);
  return session;
}

export function isSessionPrepared(state, sessionId) {
  return (state.preparationRuns || []).some((run) => run.sessionId === sessionId && run.status === 'COMPLETED');
}

export function requirePreparedSessionState(state, sessionId, message = 'Conclua a preparação da sessão antes de realizar esta ação.') {
  const session = requireOpenSessionState(state, sessionId);
  if (!isSessionPrepared(state, sessionId)) throw new Error(message);
  return session;
}
