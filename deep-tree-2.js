/* Advanced root-cause branches. Loaded after deep-tree.js. */
(function(){
const advancedPlans={
/* Financeiro */
fin_merecimento_esforco:C('Merecimento condicionado ao esforço','Ressignificar a crença de que só é permitido receber ou prosperar após esforço excessivo, fortalecendo uma relação entre valor, contribuição, descanso e justa troca.'),
fin_merecimento_familia:C('Culpa por prosperar além da família','Liberar culpa e conflitos de pertencimento associados a prosperar mais do que pessoas importantes, preservando vínculo e afeto sem reproduzir limitações financeiras.'),
fin_cobrar:C('Dificuldade de cobrar ou negociar valor','Fortalecer segurança para cobrar, negociar e comunicar valor de forma ética, clara e compatível com a contribuição oferecida.'),
fin_aceitar:C('Dificuldade de aceitar recursos e oportunidades','Reduzir resistência a receber ajuda, presentes, oportunidades ou recursos legítimos e fortalecer reciprocidade e autonomia.'),
fin_hipervigilancia:C('Hipervigilância financeira','Reduzir respostas de alerta excessivo diante de gastos ou incerteza financeira e fortalecer avaliação baseada em contexto, números e segurança real.'),
fin_medo_investir:C('Medo de investir ou fazer o dinheiro crescer','Trabalhar medo desproporcional de perda que impeça decisões de crescimento e fortalecer discernimento, educação financeira e risco calculado.'),
fin_renda_obj:C('Renda insuficiente ou instável','Tratar objetivamente a insuficiência ou instabilidade de renda, identificando oportunidades de aumento, diversificação ou maior previsibilidade.'),
fin_divida_obj:C('Dívidas e juros','Organizar e priorizar dívidas e juros com estratégia objetiva de pagamento, evitando transformar uma questão financeira concreta apenas em bloqueio simbólico.'),
fin_despesa_obj:C('Estrutura de despesas','Revisar despesas fixas, variáveis e compromissos recorrentes, alinhando o uso de recursos às prioridades e à capacidade financeira atual.'),
fin_planejamento_obj:C('Planejamento financeiro insuficiente','Fortalecer planejamento, acompanhamento, reserva e tomada de decisão financeira baseada em informação.'),
fin_resgate:C('Padrão de resgate financeiro de outras pessoas','Interromper o padrão de assumir repetidamente consequências ou responsabilidades financeiras de terceiros e fortalecer limites, responsabilidade e ajuda sustentável.'),
fin_ocultacao:C('Omissão ou conflito financeiro nas relações','Favorecer transparência e acordos financeiros claros nas relações afetadas, respeitando segurança, privacidade e responsabilidade.'),
fin_linhagem_materna:C('Padrão financeiro associado à linhagem materna','Dentro da abordagem familiar adotada, diferenciar padrões financeiros associados à linhagem materna das escolhas atuais e interromper repetições que já não sejam funcionais.'),
fin_linhagem_paterna:C('Padrão financeiro associado à linhagem paterna','Dentro da abordagem familiar adotada, diferenciar padrões financeiros associados à linhagem paterna das escolhas atuais e interromper repetições que já não sejam funcionais.'),
fin_pacto_obrigacao:C('Pacto simbólico de obrigação ou dívida','Dentro da prática espiritual, revisar simbolicamente pactos percebidos como obrigação, dívida, dependência ou impedimento de autonomia material.'),
fin_karma_merecimento:C('Tema kármico percebido de merecimento','Dentro da prática espiritual, trabalhar e ressignificar padrões interpretados como kármicos ligados a merecimento, privação ou permissão para receber.'),
fin_karma_poder:C('Tema kármico percebido de poder e dinheiro','Dentro da prática espiritual, trabalhar e ressignificar padrões interpretados como kármicos ligados a poder, controle, dinheiro ou responsabilidade material.'),
/* Carreira */
car_erro:C('Medo de errar','Reduzir a associação entre erro e desvalor pessoal, fortalecendo experimentação, aprendizagem, correção e responsabilidade.'),
car_julgamento:C('Medo de julgamento profissional','Reduzir a influência do julgamento antecipado sobre decisões profissionais e fortalecer exposição gradual e comunicação segura.'),
car_preparo_infinito:C('Preparação sem fim','Interromper o padrão de adiar ação por meio de estudo ou preparação contínuos e definir critérios objetivos de prontidão suficiente.'),
car_controle:C('Necessidade excessiva de certeza e controle','Aumentar tolerância à incerteza profissional e fortalecer decisões com informação suficiente, revisão e adaptação.'),
car_custo_afundado:C('Apego ao investimento na trajetória anterior','Separar o valor do aprendizado acumulado da obrigação de permanecer em um caminho apenas porque já houve grande investimento de tempo ou esforço.'),
car_multiplos:C('Excesso de objetivos profissionais concorrentes','Reduzir dispersão entre objetivos concorrentes e fortalecer priorização, sequência e foco por ciclos.'),
car_carga_obj:C('Sobrecarga objetiva de trabalho','Reduzir ou reorganizar carga objetiva incompatível com funcionamento sustentável e fortalecer limites e capacidade de recuperação.'),
car_autoexigencia:C('Autoexigência profissional excessiva','Ressignificar padrões internos de produtividade e valor pessoal que levam a sobrecarga mesmo quando a demanda externa não exige isso.'),
car_limites:C('Dificuldade de estabelecer limites no trabalho','Fortalecer capacidade de negociar prazos, escopo, prioridades e disponibilidade sem autoabandono profissional.'),
car_credencial:C('Barreira de credencial ou formação','Mapear objetivamente quais credenciais são realmente necessárias e criar um plano proporcional para preencher apenas as lacunas relevantes.'),
car_portfolio:C('Barreira de experiência ou portfólio','Transformar a lacuna de experiência ou portfólio em entregas demonstráveis, projetos, evidências e prática direcionada.'),
car_network:C('Barreira de networking e acesso','Fortalecer construção de relações profissionais, visibilidade e acesso a oportunidades de forma consistente e autêntica.'),
car_mercado:C('Barreira de mercado, localização ou oportunidade','Adaptar estratégia profissional às condições reais de mercado, localização e disponibilidade de oportunidades.'),
car_gestor:C('Ambiente, gestão ou cultura limitante','Tratar concretamente fatores de gestão, cultura ou ambiente que limitam desenvolvimento, segurança ou reconhecimento, avaliando possibilidades de mudança interna ou externa.'),
car_remuneracao:C('Remuneração ou reconhecimento desalinhados','Clarificar contribuição, referências de mercado e critérios de reconhecimento para apoiar negociação ou busca de alternativas.'),
car_linhagem_sacrificio:C('Mandato familiar de trabalho e sacrifício','Ressignificar padrões familiares que associam trabalho digno a sofrimento, exaustão ou renúncia constante.'),
car_pacto_servico:C('Pacto simbólico de serviço ou obrigação profissional','Dentro da prática espiritual, revisar simbolicamente pactos percebidos como obrigação de servir, obedecer ou trabalhar sem justa reciprocidade.'),
car_karma_reconhecimento:C('Tema kármico percebido de reconhecimento','Dentro da prática espiritual, trabalhar e ressignificar padrões interpretados como kármicos ligados a visibilidade, reconhecimento, autoridade ou protagonismo.'),
/* Relacionamento */
rel_critica:C('Padrão de crítica recorrente','Reduzir comunicação baseada em crítica global à pessoa e fortalecer pedidos específicos, descrição de impacto e expressão de necessidades.'),
rel_defesa:C('Defensividade recorrente','Reduzir respostas automáticas de defesa e fortalecer capacidade de escutar impacto, diferenciar intenção de efeito e assumir a parte de responsabilidade possível.'),
rel_retirada:C('Silêncio ou retirada como padrão de conflito','Interromper ciclos de afastamento prolongado ou silêncio punitivo e construir pausas combinadas com retorno seguro à conversa.'),
rel_vulnerabilidade:C('Dificuldade de expressar vulnerabilidade','Fortalecer expressão segura de medo, necessidade, tristeza, carinho e incerteza sem transformar vulnerabilidade em ataque ou cobrança.'),
rel_hipervigilancia:C('Hipervigilância após quebra de confiança','Trabalhar a resposta de vigilância persistente após quebra de confiança, em conjunto com transparência, limites e evidências concretas de segurança.'),
rel_responsabilizacao:C('Responsabilização insuficiente após quebra de confiança','Fortalecer verdade, responsabilização, reparação e coerência quando houve quebra de acordo, sem exigir reconciliação automática.'),
rel_disponibilidade:C('Indisponibilidade emocional','Fortalecer presença e disponibilidade emocional possível, respeitando limites individuais e evitando exigir conexão por coerção.'),
rel_seguranca_emocional:C('Segurança emocional insuficiente','Fortalecer um ambiente relacional em que sentimentos e necessidades possam ser expressos sem humilhação, ameaça ou punição.'),
rel_intimidade_ressent:C('Ressentimento interferindo na intimidade','Trabalhar ressentimentos que estejam reduzindo proximidade e desejo antes de pressionar por maior intimidade física.'),
rel_intimidade_saude:C('Fatores físicos ou de saúde na intimidade','Reconhecer e tratar adequadamente fatores físicos, hormonais, medicamentosos ou de saúde que possam afetar desejo ou intimidade, sem atribuí-los apenas a causas energéticas.'),
rel_decisoes:C('Desequilíbrio de poder nas decisões','Fortalecer participação, negociação e autonomia nas decisões do casal, evitando concentração persistente de poder ou controle.'),
rel_linhagem_materna:C('Modelo relacional associado à linhagem materna','Dentro da abordagem familiar adotada, diferenciar padrões relacionais associados à linhagem materna das escolhas conjugais atuais.'),
rel_linhagem_paterna:C('Modelo relacional associado à linhagem paterna','Dentro da abordagem familiar adotada, diferenciar padrões relacionais associados à linhagem paterna das escolhas conjugais atuais.'),
rel_pacto_obrigacao:C('Pacto simbólico de obrigação afetiva','Dentro da prática espiritual, revisar simbolicamente pactos percebidos como obrigação, dívida afetiva ou permanência sem liberdade de escolha.'),
rel_karma_repeticao:C('Tema kármico percebido de repetição afetiva','Dentro da prática espiritual, trabalhar e ressignificar padrões interpretados como kármicos de repetição de abandono, conflito, submissão ou indisponibilidade afetiva.')
};Object.assign(PLANS,advancedPlans);
function after(mode,parentId,items){const a=DATA[mode].questions;const i=a.findIndex(x=>x.id===parentId);if(i<0)return;a.splice(i+1,0,...items)}
/* FINANCEIRO */
after('finance','f_worth',[
 Q('f_worth_effort','Merecimento • Condição','O merecimento financeiro está condicionado a trabalhar demais, sofrer ou provar valor?','fin_merecimento_esforco','f_worth'),
 Q('f_worth_family','Merecimento • Pertencimento','Há culpa ou desconforto em prosperar mais do que pessoas importantes da família?','fin_merecimento_familia','f_worth')]);
after('finance','f_receive',[
 Q('f_receive_charge','Receber • Valor','Há dificuldade de cobrar ou negociar um valor considerado justo?','fin_cobrar','f_receive'),
 Q('f_receive_accept','Receber • Recursos','Há dificuldade de aceitar ajuda, presentes, oportunidades ou recursos legítimos sem culpa?','fin_aceitar','f_receive')]);
after('finance','f_scarcity',[
 Q('f_scarcity_alert','Escassez • Segurança','Há alerta ou ansiedade excessivos ao gastar mesmo quando o gasto cabe com segurança?','fin_hipervigilancia','f_scarcity'),
 Q('f_scarcity_growth','Escassez • Crescimento','O medo de perder impede investir, crescer ou tomar riscos financeiros calculados?','fin_medo_investir','f_scarcity')]);
after('finance','f_struct',[
 Q('f_struct_income','Estrutura • Renda','A renda atual é objetivamente insuficiente ou instável para os compromissos existentes?','fin_renda_obj','f_struct'),
 Q('f_struct_debt','Estrutura • Dívidas','Dívidas ou juros são uma causa material relevante do desequilíbrio?','fin_divida_obj','f_struct'),
 Q('f_struct_cost','Estrutura • Despesas','A estrutura de despesas está acima do que a renda comporta de forma sustentável?','fin_despesa_obj','f_struct'),
 Q('f_struct_plan','Estrutura • Planejamento','A falta de orçamento, acompanhamento, reserva ou planejamento é uma causa relevante?','fin_planejamento_obj','f_struct')]);
after('finance','f_relation',[
 Q('f_relation_rescue','Relações • Limites','Há um padrão recorrente de resgatar financeiramente outras pessoas assumindo consequências que não são suas?','fin_resgate','f_relation'),
 Q('f_relation_hidden','Relações • Transparência','Há omissões, segredos, conflitos ou acordos financeiros pouco claros afetando relações importantes?','fin_ocultacao','f_relation')]);
after('finance','f_ancestral',[
 Q('f_mat_line','Ancestralidade • Linhagem','Há padrões financeiros relevantes associados predominantemente à linhagem materna?','fin_linhagem_materna','f_ancestral'),
 Q('f_pat_line','Ancestralidade • Linhagem','Há padrões financeiros relevantes associados predominantemente à linhagem paterna?','fin_linhagem_paterna','f_ancestral')]);
after('finance','f_pacts',[Q('f_pact_duty','Espiritual • Pactos','Dentro da sua prática, o pacto identificado está relacionado a obrigação, dívida, dependência ou renúncia de autonomia material?','fin_pacto_obrigacao','f_pacts')]);
after('finance','f_karma',[
 Q('f_karma_worth','Espiritual • Karma','Dentro da sua prática, o padrão interpretado como kármico está relacionado a merecimento, privação ou dificuldade de receber?','fin_karma_merecimento','f_karma'),
 Q('f_karma_power','Espiritual • Karma','Dentro da sua prática, está relacionado a poder, controle, dinheiro ou responsabilidade material?','fin_karma_poder','f_karma')]);
/* CARREIRA */
after('career','c_perfect',[
 Q('c_perfect_error','Perfeccionismo • Erro','O perfeccionismo está ligado principalmente ao medo de errar?','car_erro','c_perfect'),
 Q('c_perfect_judge','Perfeccionismo • Julgamento','Está ligado ao medo de crítica, exposição ou julgamento?','car_julgamento','c_perfect'),
 Q('c_perfect_study','Perfeccionismo • Preparação','Há estudo, preparação ou obtenção de credenciais além do necessário antes de agir?','car_preparo_infinito','c_perfect'),
 Q('c_perfect_control','Perfeccionismo • Controle','Há necessidade de certeza ou controle excessivos antes de tomar decisões profissionais?','car_controle','c_perfect')]);
after('career','c_direction',[
 Q('c_sunk','Direção • Trajetória','Há apego ao caminho atual principalmente pelo tempo, esforço ou formação já investidos nele?','car_custo_afundado','c_direction'),
 Q('c_many_goals','Direção • Prioridades','Há objetivos profissionais demais competindo simultaneamente pela mesma energia e atenção?','car_multiplos','c_direction')]);
after('career','c_burn',[
 Q('c_burn_load','Energia • Carga externa','A exaustão decorre principalmente de carga objetiva de trabalho ou responsabilidades excessivas?','car_carga_obj','c_burn'),
 Q('c_burn_self','Energia • Autoexigência','A exaustão é mantida por autoexigência mesmo quando seria possível reduzir o ritmo?','car_autoexigencia','c_burn'),
 Q('c_burn_limits','Energia • Limites','Há dificuldade de negociar prazos, escopo, disponibilidade ou dizer não no trabalho?','car_limites','c_burn')]);
after('career','c_struct',[
 Q('c_struct_cred','Externo • Credenciais','A barreira principal está em uma credencial ou formação realmente exigida?','car_credencial','c_struct'),
 Q('c_struct_port','Externo • Evidências','A barreira principal está em experiência prática, projetos ou portfólio insuficientes?','car_portfolio','c_struct'),
 Q('c_struct_net','Externo • Acesso','A barreira principal está em networking, visibilidade ou acesso às oportunidades?','car_network','c_struct'),
 Q('c_struct_market','Externo • Mercado','A barreira principal está nas condições de mercado, localização ou disponibilidade de vagas?','car_mercado','c_struct')]);
after('career','c_work',[
 Q('c_work_env','Trabalho atual • Ambiente','Gestão, cultura ou ambiente estão limitando crescimento ou bem-estar?','car_gestor','c_work'),
 Q('c_work_pay','Trabalho atual • Reconhecimento','Há desalinhamento relevante entre contribuição, remuneração ou reconhecimento?','car_remuneracao','c_work')]);
after('career','c_ancestral',[Q('c_family_sacrifice','Ancestralidade • Trabalho','Há um padrão familiar de que trabalho digno precisa envolver sofrimento, sacrifício ou exaustão?','car_linhagem_sacrificio','c_ancestral')]);
after('career','c_pacts',[Q('c_pact_service','Espiritual • Pactos','Dentro da sua prática, o pacto identificado está relacionado a serviço obrigatório, obediência ou trabalho sem justa troca?','car_pacto_servico','c_pacts')]);
after('career','c_karma',[Q('c_karma_recog','Espiritual • Karma','Dentro da sua prática, o padrão interpretado como kármico está relacionado a visibilidade, autoridade, reconhecimento ou protagonismo?','car_karma_reconhecimento','c_karma')]);
/* CASAMENTO */
after('marriage','m_comm',[
 Q('m_criticism','Comunicação • Crítica','Há crítica recorrente à pessoa, em vez de pedidos específicos sobre comportamentos ou necessidades?','rel_critica','m_comm'),
 Q('m_defensive','Comunicação • Defesa','Há defensividade automática que impede escutar o impacto do que aconteceu?','rel_defesa','m_comm'),
 Q('m_withdraw','Comunicação • Afastamento','Há silêncio prolongado, retirada ou afastamento usados como padrão durante conflitos?','rel_retirada','m_comm'),
 Q('m_vulnerable','Comunicação • Vulnerabilidade','Há dificuldade de expressar vulnerabilidade, medo, tristeza ou necessidade de forma direta?','rel_vulnerabilidade','m_comm')]);
after('marriage','m_trust',[
 Q('m_trust_alert','Confiança • Vigilância','Após uma quebra de confiança, há hipervigilância persistente que continua afetando o vínculo?','rel_hipervigilancia','m_trust'),
 Q('m_trust_account','Confiança • Reparação','Há falta de responsabilização, reparação ou coerência suficiente após uma quebra de acordo?','rel_responsabilizacao','m_trust')]);
after('marriage','m_connection',[
 Q('m_available','Conexão • Disponibilidade','Há indisponibilidade emocional recorrente de um ou ambos os parceiros?','rel_disponibilidade','m_connection'),
 Q('m_emotional_safe','Conexão • Segurança','Falta segurança emocional para expressar sentimentos ou necessidades sem medo de humilhação, punição ou escalada?','rel_seguranca_emocional','m_connection')]);
after('marriage','m_intimacy',[
 Q('m_intimacy_resent','Intimidade • Ressentimento','Ressentimentos ou conflitos não resolvidos estão interferindo na intimidade ou no desejo?','rel_intimidade_ressent','m_intimacy'),
 Q('m_intimacy_health','Intimidade • Saúde','Há fatores físicos, hormonais, medicamentosos ou de saúde que possam estar contribuindo para o desequilíbrio de intimidade?','rel_intimidade_saude','m_intimacy')]);
after('marriage','m_roles',[Q('m_decision_power','Papéis • Decisões','Há desequilíbrio persistente de poder ou participação nas decisões importantes do casal?','rel_decisoes','m_roles')]);
after('marriage','m_ancestral',[
 Q('m_mat_line','Ancestralidade • Linhagem','Há padrões relacionais relevantes associados predominantemente à linhagem materna de um dos parceiros?','rel_linhagem_materna','m_ancestral'),
 Q('m_pat_line','Ancestralidade • Linhagem','Há padrões relacionais relevantes associados predominantemente à linhagem paterna de um dos parceiros?','rel_linhagem_paterna','m_ancestral')]);
after('marriage','m_pacts',[Q('m_pact_duty','Espiritual • Pactos','Dentro da sua prática, o pacto identificado está relacionado a obrigação, dívida afetiva ou permanência sem liberdade de escolha?','rel_pacto_obrigacao','m_pacts')]);
after('marriage','m_karma',[Q('m_karma_repeat','Espiritual • Karma','Dentro da sua prática, o padrão interpretado como kármico envolve repetição de abandono, conflito, submissão ou indisponibilidade afetiva?','rel_karma_repeticao','m_karma')]);
})();