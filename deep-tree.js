/* Deeper conditional branches. Questions are only shown when their parent answer is Sim. */
(function(){
const addPlans={
fin_origem_infancia:C('Origem infantil das crenças financeiras','Ressignificar aprendizados financeiros formados na infância que hoje limitam segurança, merecimento ou prosperidade, preservando apenas aprendizados úteis.'),
fin_origem_evento:C('Crenças financeiras formadas por perdas ou crises','Ressignificar crenças formadas após perdas, dívidas, crises ou experiências financeiras marcantes, liberando generalizações que já não correspondem ao presente.'),
fin_autossabotagem:C('Autossabotagem financeira','Interromper padrões de autossabotagem que surgem quando há oportunidade de estabilidade ou crescimento e fortalecer escolhas coerentes com objetivos financeiros.'),
fin_limite:C('Limites financeiros','Fortalecer limites financeiros e capacidade de dizer não a gastos, pedidos, responsabilidades ou acordos incompatíveis com a própria segurança financeira.'),
fin_dependencia:C('Dependência ou responsabilidade financeira excessiva','Reequilibrar responsabilidades financeiras assumidas por outras pessoas e fortalecer autonomia, reciprocidade e limites.'),
fin_perda_ancestral:C('Memória familiar de perda ou privação','Interromper simbolicamente a repetição de padrões familiares associados a perda, privação, falência ou insegurança, preservando pertencimento sem reproduzir o destino.'),
fin_voto_pobreza:C('Voto simbólico de pobreza ou renúncia material','Dentro da prática espiritual, liberar simbolicamente votos ou compromissos percebidos como associados à pobreza, renúncia material ou impedimento de receber, mantendo valores éticos e escolhas atuais.'),
fin_voto_sacrificio:C('Voto simbólico de sacrifício ou serviço','Dentro da prática espiritual, revisar simbolicamente compromissos percebidos como exigência de sacrifício, sofrimento ou serviço sem justa troca.'),
car_impostor:C('Sensação de inadequação profissional','Ressignificar padrões de inadequação e desqualificação das próprias competências, fortalecendo avaliação profissional baseada em evidências e aprendizagem contínua.'),
car_visibilidade:C('Bloqueio de visibilidade profissional','Reduzir medo ou resistência à exposição profissional e fortalecer capacidade de comunicar contribuições, competências e resultados com segurança.'),
car_autoridade:C('Conflito com autoridade, poder ou liderança','Ressignificar crenças e experiências que dificultam exercer autoridade, lidar com hierarquia ou ocupar posições de influência de forma saudável.'),
car_decisao:C('Medo de escolher e renunciar alternativas','Reduzir paralisia ligada à necessidade de manter todas as possibilidades abertas e fortalecer decisões testáveis, revisáveis e coerentes com prioridades.'),
car_reconhecimento:C('Dependência de validação profissional','Fortalecer referência interna de competência e valor profissional, reduzindo dependência excessiva de aprovação, reconhecimento ou validação externa.'),
car_familia_estabilidade:C('Mandato familiar de estabilidade profissional','Ressignificar regras familiares que associem segurança exclusivamente a permanência, emprego tradicional ou aversão a mudanças, preservando prudência sem impedir crescimento.'),
car_voto_invisibilidade:C('Voto simbólico de invisibilidade ou não protagonismo','Dentro da prática espiritual, liberar simbolicamente compromissos percebidos como associados a invisibilidade, silêncio ou impedimento de ocupar espaço profissional.'),
rel_apego:C('Padrões de apego e proteção emocional','Trabalhar padrões de aproximação, ansiedade, evitação ou proteção emocional que dificultem conexão segura e comunicação no relacionamento.'),
rel_gatilho:C('Gatilhos emocionais recorrentes','Identificar e ressignificar gatilhos recorrentes que ativam respostas desproporcionais no relacionamento, fortalecendo autorregulação e comunicação.'),
rel_reparo:C('Dificuldade de reparação após conflitos','Fortalecer capacidade de reconhecer impacto, assumir responsabilidade, pedir desculpas, reparar e retomar conexão após conflitos.'),
rel_limites:C('Limites conjugais insuficientes','Fortalecer limites individuais e conjugais claros, respeitando autonomia, consentimento, privacidade e acordos do casal.'),
rel_recipo:C('Desequilíbrio de reciprocidade','Reequilibrar padrões em que cuidado, iniciativa, esforço ou responsabilidade ficam persistentemente concentrados em uma pessoa.'),
rel_prioridade:C('Vínculo conjugal sem prioridade suficiente','Restabelecer espaço e prioridade realistas para o vínculo conjugal diante de trabalho, filhos, família extensa e outras demandas.'),
rel_modelo_pais:C('Repetição do modelo conjugal dos pais','Diferenciar conscientemente o casamento atual dos modelos conjugais observados na família de origem e escolher padrões compatíveis com os valores atuais.'),
rel_voto_solidão:C('Voto simbólico de solidão ou impedimento afetivo','Dentro da prática espiritual, liberar simbolicamente compromissos percebidos como associados à solidão, afastamento ou impedimento de vínculo afetivo saudável.'),
rel_voto_submissao:C('Voto simbólico de submissão ou autoabandono','Dentro da prática espiritual, liberar simbolicamente compromissos percebidos como associados à submissão ou autoabandono, fortalecendo autonomia, respeito e reciprocidade.')
};Object.assign(PLANS,addPlans);
function insertAfter(mode,parentId,items){const a=DATA[mode].questions;const i=a.findIndex(x=>x.id===parentId);if(i<0)return;a.splice(i+1,0,...items)}
/* Finance: source -> mechanism -> specific root pattern. */
insertAfter('finance','f_beliefs',[
 Q('f_beliefs_child','Crenças • Origem','Essas crenças financeiras foram formadas principalmente na infância ou adolescência?','fin_origem_infancia','f_beliefs'),
 Q('f_beliefs_event','Crenças • Origem','Essas crenças foram reforçadas por perdas, dívidas, crises ou experiências financeiras marcantes?','fin_origem_evento','f_beliefs')]);
insertAfter('finance','f_behavior',[
 Q('f_selfsabotage','Comportamento • Padrão','Há autossabotagem quando surge oportunidade de melhorar, ganhar mais ou estabilizar as finanças?','fin_autossabotagem','f_behavior'),
 Q('f_limits','Comportamento • Limites','Há dificuldade de estabelecer limites financeiros com outras pessoas?','fin_limite','f_behavior'),
 Q('f_dependency','Comportamento • Responsabilidade','Há responsabilidade financeira excessiva por outras pessoas ou dependência financeira interferindo no equilíbrio?','fin_dependencia','f_behavior')]);
insertAfter('finance','f_family_pattern',[Q('f_family_loss','Ancestralidade • Padrão','Há histórico familiar relevante de perda patrimonial, falência, privação, migração forçada ou insegurança material que esteja sendo repetido simbolicamente?','fin_perda_ancestral','f_family_pattern')]);
insertAfter('finance','f_vows',[
 Q('f_vow_poverty','Espiritual • Votos','Dentro da sua prática, o voto ou promessa identificado está relacionado a pobreza, desapego obrigatório ou renúncia material?','fin_voto_pobreza','f_vows'),
 Q('f_vow_service','Espiritual • Votos','Dentro da sua prática, está relacionado a sacrifício, sofrimento, serviço sem troca ou obrigação de dar mais do que recebe?','fin_voto_sacrificio','f_vows')]);
/* Career */
insertAfter('career','c_beliefs',[
 Q('c_impostor','Crenças • Competência','Há sensação persistente de não ser suficientemente competente apesar de evidências de capacidade?','car_impostor','c_beliefs'),
 Q('c_visibility','Crenças • Visibilidade','Há resistência a se expor, divulgar resultados, pedir oportunidades ou ocupar maior visibilidade profissional?','car_visibilidade','c_beliefs'),
 Q('c_authority','Crenças • Poder','Há conflito interno relacionado a autoridade, liderança, poder ou ocupar posições de influência?','car_autoridade','c_beliefs')]);
insertAfter('career','c_direction',[
 Q('c_choice','Direção • Decisão','A dificuldade de direção está ligada ao medo de escolher um caminho e abrir mão temporariamente de outras possibilidades?','car_decisao','c_direction'),
 Q('c_validation','Direção • Validação','A decisão profissional depende excessivamente de aprovação, reconhecimento ou validação de outras pessoas?','car_reconhecimento','c_direction')]);
insertAfter('career','c_family_pattern',[Q('c_stability_family','Ancestralidade • Trabalho','Há um mandato familiar de buscar estabilidade, evitar risco ou permanecer em caminhos profissionais considerados seguros?','car_familia_estabilidade','c_family_pattern')]);
insertAfter('career','c_vows',[Q('c_vow_invisible','Espiritual • Votos','Dentro da sua prática, o voto ou promessa identificado está relacionado a invisibilidade, silêncio, humildade compulsória ou não ocupar protagonismo?','car_voto_invisibilidade','c_vows')]);
/* Marriage */
insertAfter('marriage','m_internal',[
 Q('m_attachment','Interno • Vínculo','Há padrões de ansiedade, evitação, afastamento ou necessidade de controle ativados pela proximidade emocional?','rel_apego','m_internal'),
 Q('m_trigger','Interno • Reatividade','Há gatilhos emocionais recorrentes que fazem situações atuais serem vividas com intensidade ligada a experiências anteriores?','rel_gatilho','m_internal')]);
insertAfter('marriage','m_cycle',[Q('m_repair','Comunicação • Reparação','Depois dos conflitos, há dificuldade de reconhecer impacto, reparar a situação e restabelecer conexão?','rel_reparo','m_cycle')]);
insertAfter('marriage','m_roles',[
 Q('m_boundaries','Papéis • Limites','Há limites pouco claros entre necessidades individuais, responsabilidades do casal e demandas de outras pessoas?','rel_limites','m_roles'),
 Q('m_reciprocity','Papéis • Reciprocidade','Há desequilíbrio persistente de esforço, cuidado, iniciativa ou responsabilidade entre os parceiros?','rel_recipo','m_roles')]);
insertAfter('marriage','m_time',[Q('m_priority','Conexão • Prioridade','O relacionamento deixou de receber prioridade suficiente diante de trabalho, filhos, família extensa ou outras demandas?','rel_prioridade','m_time')]);
insertAfter('marriage','m_familymodel',[Q('m_parentmodel','Ancestralidade • Modelo','Há repetição específica do modelo de casamento observado nos pais ou cuidadores de um dos parceiros?','rel_modelo_pais','m_familymodel')]);
insertAfter('marriage','m_vows',[
 Q('m_vow_lonely','Espiritual • Votos','Dentro da sua prática, o voto ou promessa identificado está relacionado a solidão, afastamento afetivo ou impedimento de união?','rel_voto_solidão','m_vows'),
 Q('m_vow_submit','Espiritual • Votos','Dentro da sua prática, está relacionado a submissão, obediência, autoabandono ou renúncia às próprias necessidades?','rel_voto_submissao','m_vows')]);
})();