const labels = Object.freeze({
  SESSION_STARTED: 'Sessão iniciada',
  SESSION_CLOSED: 'Sessão encerrada',
  PREPARATION_STARTED: 'Preparação iniciada',
  PREPARATION_COMPLETED: 'Preparação concluída',
  CLOSING_COMPLETED: 'Encerramento realizado',
  SESSION_ASSISTED_SELECTED: 'Assistido selecionado',
  INVESTIGATION_STARTED: 'Investigação iniciada',
  INVESTIGATION_RESUMED: 'Investigação retomada',
  INVESTIGATION_COMPLETED: 'Investigação concluída',
  FINDING_IDENTIFIED: 'Achado registrado',
  TREATMENT_CREATED: 'Tratamento criado',
  TREATMENT_STARTED: 'Tratamento iniciado',
  TREATMENT_INTERRUPTED: 'Tratamento interrompido',
  TREATMENT_RESUMED: 'Tratamento retomado',
  TREATMENT_REVIEWED: 'Tratamento revisado',
  TREATMENT_COMPLETED: 'Tratamento concluído',
  COMPONENT_PLANNED: 'Componente planejado',
  COMPONENT_STARTED: 'Componente iniciado',
  COMPONENT_COMPLETED: 'Componente concluído',
  COMPONENT_ADDED: 'Componente adicionado',
  COMPONENT_STOPPED: 'Componente interrompido',
  COMPONENT_REPLACED: 'Componente substituído',
  COMPONENT_RESCHEDULED: 'Prazo do componente ajustado',
  COMPONENT_REVIEWED: 'Componente revisado',
  COMPONENT_DISMANTLED: 'Componente desmontado',
  TREATMENT_FINAL_ASSESSMENT: 'Avaliação final registrada',
  SESSION_CLOSE_CORRECTED: 'Encerramento corrigido',
  ASSISTED_CREATED: 'Assistido criado',
  ASSISTED_UPDATED: 'Dados do assistido atualizados',
  ASSISTED_ARCHIVED: 'Assistido arquivado',
  ASSESSMENT_RECORDED: 'Avaliação registrada',
  TOOL_CREATED: 'Recurso criado',
  TOOL_UPDATED: 'Recurso atualizado',
  TOOL_ARCHIVED: 'Recurso arquivado',
  REIKI_STARTED: 'Reiki iniciado',
  REIKI_PAUSED: 'Reiki pausado',
  REIKI_RESUMED: 'Reiki retomado',
  REIKI_COMPLETED: 'Reiki concluído',
  REIKI_CANCELED: 'Reiki cancelado',
  NOTE_CREATED: 'Anotação'
});

function translate() {
  document.querySelectorAll('.timeline-copy strong').forEach((node) => {
    const replacement = labels[node.textContent?.trim()];
    if (replacement) node.textContent = replacement;
  });
}

new MutationObserver(translate).observe(document.body, { childList:true, subtree:true });
queueMicrotask(translate);
