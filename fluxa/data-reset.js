(() => {
  const marker = 'fluxa.validation-reset.2026-08-22.v2';
  try {
    if (localStorage.getItem(marker) === 'done') return;
    ['fluxa.mvp.v1','fluxa.mvp.v1.backup','fluxa.mvp.v1.recovery'].forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem('fluxa.activeRoute');
    localStorage.setItem(marker, 'done');
  } catch (error) {
    console.warn('Fluxa: não foi possível executar a limpeza única de validação.', error);
  }
})();
