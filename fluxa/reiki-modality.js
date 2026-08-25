export function isReikiEnabled(state) {
  const enabled = state?.settings?.therapeuticModalities?.enabled;
  return Array.isArray(enabled) && enabled.includes('REIKI');
}

export function activeReikiApplication(state, sessionId = null) {
  return (state?.reikiApplications || []).find((item) => {
    if (!['RUNNING', 'PAUSED'].includes(item?.status)) return false;
    if (sessionId == null) return true;
    return item.sessionId === sessionId;
  }) || null;
}
