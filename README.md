# Protocolos Interativos

Aplicação web estática, mobile/iPad-first, para condução e registro de investigações binárias de causa raiz dentro da prática de radiestesia terapêutica.

## V1 — baseline preservado
- Vida Financeira
- Carreira / Profissional
- Casamento / Relacionamento

A V1 consolidou o fluxo: investigação condicional Sim/Não → achados → validação causal → ordem de tratamento → gráficos + duração estruturada → validação pós-tratamento → relatório/PDF → histórico local.

## V1.1 — expansão
### Core
- Autoestima, Amor-próprio e Merecimento
- Relacionamentos Familiares
- Protocolo Mestre de Causa Raiz

### Protocolos profundos adicionais
- Prosperidade e Abundância
- Propósito e Caminho de Vida
- Casa e Ambiente
- Relacionamento com o Próprio Corpo
- Criatividade e Projetos
- Vida Social e Pertencimento
- Parentalidade
- Padrões Repetitivos

Os protocolos V1.1 reutilizam o mesmo controlador e a mesma arquitetura de sessão da V1. As expansões de conteúdo ficam isoladas em arquivos de dados (`protocols-v11-core.js` e `protocols-v11-expansion.js`) para reduzir risco de regressão e evitar múltiplos controladores disputando os mesmos eventos de interface.

O protocolo de Relacionamento com o Próprio Corpo é reflexivo e não diagnóstico. Questões físicas, sintomas, condições de saúde e efeitos de medicamentos são direcionados para avaliação profissional adequada quando necessário.

## Recursos
- perguntas Sim/Não com abertura condicional de ramos;
- percentual de progresso adaptativo;
- múltiplos achados na mesma sessão;
- validação de causa raiz e causa anterior;
- priorização e ordem de tratamento;
- comandos sugeridos por achado;
- múltiplos gráficos por item;
- duração estruturada em minutos, horas, dias, semanas ou meses;
- validação pós-tratamento e indicação de acompanhamento;
- relatório imprimível/salvável em PDF;
- histórico local via `localStorage`;
- compatível com GitHub Pages e uso no Safari/iPad.

## Enquadramento
Aspectos espirituais, simbólicos e energéticos são apresentados explicitamente como pertencentes à prática ou ao sistema de crenças da pessoa. Questões concretas, psicológicas, relacionais, financeiras ou de saúde não devem ser reduzidas automaticamente a explicações simbólicas e podem exigir medidas profissionais adequadas.

## Publicar no GitHub Pages
1. Ative GitHub Pages para a branch `main`, pasta `/ (root)`.
2. Abra a URL publicada no Safari do iPad.
3. Opcionalmente use Compartilhar → Adicionar à Tela de Início.

O histórico permanece somente no navegador/dispositivo em que a aplicação é utilizada.