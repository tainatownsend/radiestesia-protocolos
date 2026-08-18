# Protocolos Interativos

Aplicação web estática, mobile/iPad-first, para condução e registro de investigações binárias e sessões breves dentro da prática de radiestesia terapêutica.

## V1 — baseline preservado
- Vida Financeira
- Carreira / Profissional
- Casamento / Relacionamento

A V1 consolidou o fluxo: investigação condicional Sim/Não → achados → validação causal → ordem de tratamento → gráficos + duração estruturada → validação pós-tratamento → relatório/PDF → histórico local.

## V1.1 — expansão
### Protocolo Mestre
- Protocolo Mestre de Causa Raiz

Usado quando existe um padrão recorrente ou uma questão importante, mas a área/origem ainda não está clara.

### Investigações profundas
#### Core
- Autoestima, Amor-próprio e Merecimento
- Relacionamentos Familiares

#### Protocolos adicionais
- Prosperidade e Abundância
- Propósito e Caminho de Vida
- Casa e Ambiente
- Relacionamento com o Próprio Corpo
- Criatividade e Projetos
- Vida Social e Pertencimento
- Parentalidade
- Padrões Repetitivos

As investigações profundas reutilizam o controlador consolidado da V1 e preservam validação causal e priorização antes do tratamento.

### Protocolos rápidos
- Limpeza e Reequilíbrio
- Reequilíbrio após um Dia Difícil
- Preparação para uma Decisão Importante
- Encerramento de Ciclo
- Reequilíbrio após Conflito

Os protocolos rápidos são intencionalmente curtos e focados no estado atual. Eles usam uma pequena sequência Sim/Não, mostram os itens identificados e seguem diretamente para o tratamento, sem executar a investigação causal extensa. Continuam oferecendo múltiplos gráficos por item, duração estruturada, validação pós-tratamento, relatório/PDF e histórico detalhado.

## Arquitetura de navegação
A Home diferencia claramente três rotas:
1. **Protocolo Mestre** — quando a pessoa não sabe por onde começar;
2. **Investigações profundas** — agrupadas por temas para reduzir carga cognitiva;
3. **Protocolos rápidos** — para situações atuais que não exigem uma investigação extensa.

Os protocolos V1.1 permanecem majoritariamente como camadas de dados (`protocols-v11-core.js`, `protocols-v11-expansion.js` e `protocols-v11-quick.js`) e reutilizam `controller-v4.js`, evitando múltiplos controladores concorrentes.

O protocolo de Relacionamento com o Próprio Corpo é reflexivo e não diagnóstico. Questões físicas, sintomas, condições de saúde e efeitos de medicamentos são direcionados para avaliação profissional adequada quando necessário.

## Recursos
- perguntas Sim/Não com abertura condicional de ramos;
- percentual de progresso adaptativo;
- múltiplos achados na mesma sessão;
- validação causal e priorização nos protocolos profundos;
- fluxo reduzido nos protocolos rápidos;
- comandos sugeridos por achado;
- múltiplos gráficos por item;
- duração estruturada em minutos, horas, dias, semanas ou meses;
- validação pós-tratamento e indicação de acompanhamento;
- relatório imprimível/salvável em PDF;
- histórico local via `localStorage`;
- interface responsiva e touch-friendly para Safari/iPad;
- compatível com GitHub Pages.

## Enquadramento
Aspectos espirituais, simbólicos e energéticos são apresentados explicitamente como pertencentes à prática ou ao sistema de crenças da pessoa. Questões concretas, psicológicas, relacionais, financeiras ou de saúde não devem ser reduzidas automaticamente a explicações simbólicas e podem exigir medidas profissionais adequadas.

## Publicar no GitHub Pages
1. Ative GitHub Pages para a branch `main`, pasta `/ (root)`.
2. Abra a URL publicada no Safari do iPad.
3. Opcionalmente use Compartilhar → Adicionar à Tela de Início.

O histórico permanece somente no navegador/dispositivo em que a aplicação é utilizada.