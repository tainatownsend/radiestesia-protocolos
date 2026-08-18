# Protocolos Interativos

Aplicação web estática, mobile/iPad-first, para condução e registro de investigações binárias, avaliações iniciais e sessões breves dentro da prática de radiestesia terapêutica.

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

## Avaliação Inicial / Sessão completa
A Home também oferece **Nova sessão completa**, mantendo todos os protocolos acessíveis diretamente para quem deseja pular esta etapa.

O módulo de Avaliação Inicial transforma as fichas de anamnese em um fluxo guiado e progressivo:
1. identificação da sessão e relato;
2. campos mental, emocional, espiritual e físico;
3. aferição condicional dos sete chakras;
4. campo áurico — proteção, tamanho, cores em falta/excesso e comentário;
5. aferição radiestésica reflexiva de sistemas corporais, órgãos e glândulas;
6. registro da energia de saúde conforme a escala utilizada na prática;
7. áreas Familiar, Relacionamento afetivo, Profissional, Financeiro e Missão de vida;
8. resumo e sugestões de protocolos.

Ao selecionar um protocolo sugerido, a avaliação fica vinculada à sessão. Após investigação e tratamento, o app solicita **reavaliação Antes × Depois apenas dos itens inicialmente alterados** e inclui o resultado no relatório/PDF e no Histórico.

A arquitetura da sessão passa a comunicar o caminho **Avaliação → Investigação → Tratamento → Reavaliação → Relatório**, sem obrigar a avaliação inicial para sessões diretas.

Os dados da avaliação são persistidos localmente em `rt_assessments_v1`; sessões vinculadas continuam usando o histórico consolidado da V1/V1.1. O módulo principal está isolado em `initial-assessment.js`, com uma pequena proteção de navegação em `initial-assessment-guard.js`, sem substituir ou duplicar `controller-v4.js`.

## Arquitetura de navegação
A Home diferencia quatro rotas:
1. **Nova sessão completa** — avaliação inicial seguida de investigação, tratamento, reavaliação e relatório;
2. **Protocolo Mestre** — quando a pessoa não sabe por onde começar;
3. **Investigações profundas** — agrupadas por temas para reduzir carga cognitiva;
4. **Protocolos rápidos** — para situações atuais que não exigem uma investigação extensa.

Os protocolos V1.1 permanecem majoritariamente como camadas de dados (`protocols-v11-core.js`, `protocols-v11-expansion.js` e `protocols-v11-quick.js`) e reutilizam `controller-v4.js`, evitando múltiplos controladores concorrentes.

O protocolo de Relacionamento com o Próprio Corpo e a etapa de saúde da Avaliação Inicial são reflexivos e não diagnósticos. Questões físicas, sintomas, condições de saúde e efeitos de medicamentos são direcionados para avaliação profissional adequada quando necessário.

## Recursos
- Avaliação Inicial guiada e mobile/iPad-first;
- perguntas Sim/Não com abertura condicional de ramos;
- percentual de progresso adaptativo;
- múltiplos achados na mesma sessão;
- validação causal e priorização nos protocolos profundos;
- fluxo reduzido nos protocolos rápidos;
- sugestões de protocolos a partir da avaliação inicial;
- comandos sugeridos por achado;
- múltiplos gráficos por item;
- duração estruturada em minutos, horas, dias, semanas ou meses;
- reavaliação Antes × Depois dos itens inicialmente alterados;
- validação pós-tratamento e indicação de acompanhamento;
- relatório imprimível/salvável em PDF com avaliação e comparação;
- histórico local detalhado via `localStorage`;
- interface responsiva e touch-friendly para Safari/iPad;
- compatível com GitHub Pages.

## Enquadramento
Aspectos espirituais, simbólicos e energéticos são apresentados explicitamente como pertencentes à prática ou ao sistema de crenças da pessoa. Questões concretas, psicológicas, relacionais, financeiras ou de saúde não devem ser reduzidas automaticamente a explicações simbólicas e podem exigir medidas profissionais adequadas.

Aferições relativas a sistemas corporais, órgãos, glândulas ou “energia de saúde” são registradas como parte da prática radiestésica e **não são apresentadas como diagnóstico, exame clínico ou substituto de avaliação médica**.

## Publicar no GitHub Pages
1. Ative GitHub Pages para a branch `main`, pasta `/ (root)`.
2. Abra a URL publicada no Safari do iPad.
3. Opcionalmente use Compartilhar → Adicionar à Tela de Início.

O histórico permanece somente no navegador/dispositivo em que a aplicação é utilizada.