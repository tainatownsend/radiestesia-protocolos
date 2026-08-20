const labels = Object.freeze({
  COMPONENT_PLANNED: 'Componente planejado',
  COMPONENT_ADDED: 'Componente adicionado',
  COMPONENT_STOPPED: 'Componente interrompido',
  COMPONENT_REPLACED: 'Componente substituído',
  COMPONENT_RESCHEDULED: 'Prazo do componente ajustado',
  COMPONENT_REVIEWED: 'Componente revisado',
  COMPONENT_DISMANTLED: 'Componente desmontado',
  TREATMENT_FINAL_ASSESSMENT: 'Avaliação final registrada',
  SESSION_CLOSE_CORRECTED: 'Encerramento corrigido',
  ASSISTED_UPDATED: 'Dados do assistido atualizados',
  ASSISTED_ARCHIVED: 'Assistido arquivado',
  ASSESSMENT_RECORDED: 'Avaliação registrada',
  TOOL_CREATED: 'Recurso criado',
  TOOL_UPDATED: 'Recurso atualizado',
  TOOL_ARCHIVED: 'Recurso arquivado'
});

function translate() {
  document.querySelectorAll('.timeline-copy strong').forEach((node) => {
    const replacement = labels[node.textContent?.trim()];
    if (replacement) node.textContent = replacement;
  });
}

new MutationObserver(translate).observe(document.body, { childList:true, subtree:true });
queueMicrotask(translate);
