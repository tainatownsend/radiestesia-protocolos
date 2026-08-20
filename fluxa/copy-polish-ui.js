const visibleTerms = new Map([
  ['PLANNED','Planejado'],
  ['IN_PROGRESS','Em andamento'],
  ['COMPLETED','Concluído'],
  ['INTERRUPTED','Interrompido'],
  ['STOPPED','Interrompido'],
  ['REPLACED','Substituído'],
  ['RUNNING','Em andamento'],
  ['PAUSED','Pausado'],
  ['CANCELED','Cancelado'],
  ['PERSON','Pessoa'],
  ['PET','PET'],
  ['ENVIRONMENT','Ambiente'],
  ['GROUP','Grupo'],
  ['SITUATION','Situação / Processo'],
  ['OTHER','Outro'],
  ['GRAPH','Gráfico'],
  ['BIOMETER','Biômetro'],
  ['TOOL','Recurso']
]);

function polishText(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (!node.parentElement || node.parentElement.closest('script,style,option')) continue;
    let value = node.nodeValue;
    for (const [raw, label] of visibleTerms) {
      value = value.replace(new RegExp(`\\b${raw}\\b`, 'g'), label);
    }
    if (value !== node.nodeValue) node.nodeValue = value;
  }
}

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.TEXT_NODE) polishText(node.parentElement || document.body);
      else if (node.nodeType === Node.ELEMENT_NODE) polishText(node);
    }
  }
}).observe(document.body, { childList:true, subtree:true });
queueMicrotask(() => polishText());
