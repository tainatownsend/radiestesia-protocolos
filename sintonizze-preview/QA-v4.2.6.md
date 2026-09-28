# Sintonizze v4.2.6 — continuidade operacional

Baseline: PR #258, branch `sintonizze/northstar-v4-2-implementation-preview`, commit anterior `2d69f85`.

## Falhas confirmadas e corrigidas

- Três extensões fora do escopo da aplicação lançavam ReferenceError e impediam o cadastro/lista e os ajustes mobile de Assistidos. Extensões agora executam dentro do escopo privado; removido botão flutuante redundante.
- Tratamentos consultava a estrutura antiga, ignorando os tratamentos v4.2 salvos. Lista e Hoje agora usam registros reais, sem contagens/progressos fictícios.
- Categorias/Recentes da biblioteca não filtravam. Agora filtram e ordenam por favorito/uso; novos gráficos criados durante um tratamento retornam ao componente.
- Notas e duração digitadas se perdiam ao alternar opções. Rascunho retido; identidade do componente preservada ao editar.
- Investigações novas não guardavam ID do assistido. Agora guardam; migração conservadora de nomes antigos apenas quando há uma correspondência única. Renomear mantém vínculos e o contexto histórico original.
- Leituras iniciais não são mais pré-preenchidas com números demonstrativos. Omissão permanece ausente, diferente de zero. Reavaliação cria novo registro ligado ao original e usa seu snapshot de roteiro.
- Percentual de pergunta Sim/Não só é liberado após a resposta binária. Resultados usam somente ramos ativos.
- Impressão inclui leituras iniciais, observação e resumo dos tratamentos vinculados, além dos achados. Mantém o retorno à sessão.

## Próximos passos já implementados

- Duração por componente com prazo definido, até reavaliar ou até concluir.
- Datas de checagem para prazos definidos e lista Para verificar na Home.
- Pausar/retomar/concluir tratamento; tratamento concluído permanece bloqueado para edição.
- Concluir componente; snapshot do comando para preservar o texto aplicado.
- Exportar backup novamente acessível em Mais.
- Rótulos associados aos campos e controles com alvos de toque maiores; perguntas longas possuem área rolável sem cortar os controles de navegação.

## Verificação

`npm ci --ignore-scripts && npm test` neste diretório.

Seis testes de regressão usando o HTML integral e DOM simulado:
1. Inicialização de extensões + CRUD + recarregamento.
2. Filtros, rascunhos e edição com ID estável.
3. Investigação completa, percentual omitido, impressão, vínculo e reavaliação imutável.
4. Duração aberta e bloqueio de tratamento concluído.
5. Novo gráfico retorna ao componente e múltiplos focos são preservados.
6. Renomeação preserva histórico; checagem vencida aparece em Hoje.

DOM simulado verifica funcionamento, não layout ou impressão física. QA visual no navegador e aceite Safari/iPhone devem ser registrados separadamente.

## Gate humano remanescente

Validar no iPhone físico: cadastro → investigação → tratamento com dois focos → impressão/salvar PDF. Conferir cortes, conforto dos toques, retorno e persistência. Backend/Supabase e promoção a produção continuam após esse aceite, conforme decisão anterior. O preview continua local, sem login/sincronização. “Arquivos” ainda guarda somente metadados, não anexos completos.

## Verificação do preview publicado — 27/09/2026

Fluxo exercitado em Chromium: investigação completa de 12 perguntas, percentual 25%, leituras iniciais 250/10.000, observação, criação de tratamento vinculado, inclusão de gráfico/comando, mudança de duração, salvamento, recarga e reabertura do resultado. Os dados persistiram; o relatório de impressão incluiu contexto, leituras, percentual, foco, gráfico, duração, nota e comando. Retorno da visualização de impressão verificado.

Encontrado e corrigido durante o teste: o resumo de Sessões ainda mostrava zero tratamentos porque contava somente a estrutura antiga. Contagem e rótulo agora incluem tratamentos vinculados v4.2. O cabeçalho de tratamento também acompanha seu estado real. Regressão existente ampliada para cobrir o resumo.

O botão de impressão foi acionado, mas este navegador remoto não exibiu o diálogo nativo. Portanto, impressão física/salvar PDF no Safari ainda NÃO está validada. Não foi feita validação visual de todas as larguras nesta rodada.
