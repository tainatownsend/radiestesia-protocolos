# Fluxa — PR #95 mobile/iPad validation

Objetivo: validar visualmente e operacionalmente a nova arquitetura antes do merge. Use um ambiente de preview da branch `fluxa/ux-architecture-refresh`; a URL pública de GitHub Pages no `/fluxa/` aponta para `main` e não serve como validação da PR #95.

## 1. Navegação principal
- Confirmar navegação visível: `Hoje | Tratamentos | Histórico | Acervo`.
- Confirmar que a barra inferior não corta texto nem cria overflow em iPhone.
- Abrir o controle de configuração no topo e confirmar que preferências/modalidades não aparecem misturadas ao fluxo de atendimento.
- Girar iPad entre retrato e paisagem e confirmar estabilidade da navegação/topbar.

## 2. Hoje sem sessão
- Confirmar que a ação principal para iniciar atendimento domina a tela.
- Confirmar que manutenção/backup não compete visualmente com a ação principal.
- Se Reiki estiver desabilitado nas modalidades, confirmar que ações standalone de Reiki não aparecem.

## 3. Sessão preparada
- Iniciar uma sessão, escolher Assistido e concluir a preparação.
- Confirmar cockpit com Assistido atual, ações de trabalho repetíveis e contadores vivos.
- Criar pelo menos uma investigação, uma anotação e um tratamento e verificar atualização dos contadores sem recarregar.
- Confirmar que o valor Hawkins atual aparece somente quando existe medição válida.

## 4. Entrada de investigação
- Tocar `Investigar` e confirmar que a primeira tela mostra apenas: Rápida, Inicial, Completa, Protocolo específico e `Não sei por onde começar`.
- Confirmar que `Não sei por onde começar` leva ao Protocolo Mestre.
- Confirmar que o catálogo completo só aparece após escolher `Protocolo específico`.
- No catálogo específico, pesquisar um protocolo, abrir um recente e voltar sem perder a sessão.
- Durante perguntas Sim/Não, verificar ausência de tremida/salto de viewport e ausência de duplo avanço após toque único.

## 5. Acervo
- Abrir `Acervo` e confirmar áreas separadas para Assistidos, Protocolos, Gráficos & Recursos e Terapias.
- Em Gráficos & Recursos, testar busca e filtros `Todos / Favoritos / Recentes` com o teclado iOS aberto.
- Confirmar que listas longas continuam roláveis e que a barra inferior não cobre o último item.
- Confirmar que Terapias reflete apenas modalidades configuradas, sem assumir Reiki como métrica fixa.

## 6. Assistido longitudinal
- Abrir um Assistido com histórico.
- Confirmar abas: Resumo, Histórico, Tratamentos, Investigações e Relatórios.
- Confirmar que o Resumo omite métricas vazias/zeros sem significado.
- Confirmar que tratamentos e investigações pertencem somente ao Assistido aberto.
- Abrir um relatório antigo e confirmar que dados de sessões posteriores não aparecem nele.

## 7. Tratamentos
- Abrir um tratamento ativo e confirmar leitura rápida do estado atual.
- Confirmar item → comando → gráfico(s), incluindo múltiplos gráficos e tempos independentes quando existentes.
- Confirmar que ações do tratamento permanecem alcançáveis no iPhone sem overflow.
- Interromper/retomar apenas se houver um tratamento descartável de teste; confirmar que o registro continua longitudinal.

## 8. Encerramento seguro
- Com sessão aberta, deixar uma investigação incompleta e um tratamento longitudinal ativo.
- Tocar `Revisar e encerrar`.
- Confirmar revisão com duração, Assistidos trabalhados, investigações, tratamentos e trabalho ainda aberto.
- Confirmar que investigação aberta é informada como resumível e não bloqueia encerramento.
- Confirmar que tratamento longitudinal ativo não é concluído automaticamente e não bloqueia encerramento.
- Se houver Reiki RUNNING/PAUSED ligado à sessão, confirmar que o encerramento é bloqueado até concluir/cancelar.
- Confirmar checkbox/etapa final de encerramento seguro antes de fechar a sessão.

## 9. Histórico e relatórios
- Após fechar a sessão, abrir `Histórico`.
- Reabrir a sessão encerrada e acessar relatório interno e resumo para compartilhar.
- Confirmar que o resumo compartilhável não contém comandos internos nem notas técnicas.
- Testar Web Share/Imprimir se disponível no dispositivo.

## 10. iPhone/iPad — critérios de reprovação
Registrar screenshot/vídeo se ocorrer qualquer um destes pontos:
- conteúdo cortado ou scroll horizontal;
- barra inferior cobrindo botões/campos;
- sheet maior que a viewport sem acesso ao botão final;
- teclado iOS escondendo busca/ação principal;
- tremida ou salto relevante após Sim/Não;
- clique que avança duas etapas;
- volta que fecha o fluxo errado ou perde contexto;
- duplicação de ações/blocos antigos;
- tela congelada após abrir/fechar overlays;
- informação de outro Assistido/sessão aparecendo no contexto atual.

## Evidência mínima para liberar o merge
Enviar:
1. screenshot da Home sem sessão;
2. screenshot da Home com sessão preparada;
3. screenshot da entrada de Investigação;
4. screenshot de Acervo → Gráficos & Recursos com busca/filtros;
5. screenshot de um Assistido na aba Resumo;
6. screenshot da revisão de encerramento;
7. vídeo curto (30–90 s) mostrando navegação entre Hoje → Investigar → responder 2–3 perguntas → voltar → Acervo → Histórico, preferencialmente no iPhone;
8. no iPad, ao menos um screenshot em retrato e um em paisagem.

Se nenhum critério de reprovação ocorrer e o CI estiver verde no merge result contra o `main` atual, a PR pode sair de draft para merge.