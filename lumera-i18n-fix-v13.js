(function(){
'use strict';
const LANG_KEY='lumera_language_v13';
let running=false;
const EXACT={
  'Nova sessão completa':'New complete session','Começar avaliação inicial':'Start initial assessment','Ir aos protocolos':'Go to protocols',
  'Comece pela avaliação inicial, escolha a investigação indicada e registre tratamento, reavaliação e relatório em um único fluxo.':'Start with the initial assessment, choose the indicated investigation, and record treatment, reassessment, and report in one flow.',
  'Defina se o atendimento é individual ou coletivo e registre os participantes.':'Choose whether the session is individual or group-based and record the participants.',
  'Tipo de sessão':'Session type','O que você deseja trabalhar nesta sessão?':'What would you like to work on in this session?','Relato, tema ou situação principal...':'Main concern, topic, or situation...',
  'Campos energéticos':'Energy fields','Registre os campos mental, emocional, espiritual e físico. Todos os percentuais avançam em intervalos de 5%.':'Record the mental, emotional, spiritual, and physical fields. All percentages move in 5% increments.',
  'Próxima etapa:':'Next step:','há chakras que precisam ser aferidos nesta sessão?':'are there chakras that need to be assessed in this session?',
  'Frequência vibracional':'Vibrational frequency','Registre a frequência vibracional aferida dentro da prática.':'Record the vibrational frequency measured within the practice.',
  'Campo áurico':'Auric field','Proteção da aura':'Aura protection','Tamanho da aura':'Aura size','Comentário sobre a aura':'Aura notes',
  'Saúde física':'Physical health','Energia de saúde':'Health energy','Áreas da vida':'Life areas','Por onde começar':'Where to start',
  'Dados da sessão':'Session details','Resumo da avaliação':'Assessment summary','Finalizar avaliação':'Finish assessment','Salvar avaliação':'Save assessment',
  'Uma pessoa por linha. Use “Nome — DD/MM/AAAA” ou apenas o nome.':'One person per line. Use “Name — DD/MM/YYYY” or just the name.',
  'Importar lista':'Import list','Nome completo':'Full name','Nome da pessoa':'Person name','Remover participante':'Remove participant',
  'Campo Mental':'Mental field','Campo Emocional':'Emotional field','Campo Espiritual':'Spiritual field','Campo Físico':'Physical field',
  'Há desequilíbrio aferido neste campo?':'Is an imbalance detected in this field?','Percentual de desequilíbrio':'Imbalance percentage',
  'Desequilíbrio aferido':'Detected imbalance','Afeta corpo físico?':'Affects the physical body?','Atividade do chakra':'Chakra activity',
  'Cores em falta':'Missing colors','Cores em excesso':'Excess colors','Sistemas corporais':'Body systems','Órgãos / glândulas':'Organs / glands',
  'Adicionar sistema':'Add system','Adicionar órgão / glândula':'Add organ / gland','Observações de saúde física':'Physical health notes',
  'Valor aferido':'Measured value','Classificação':'Classification','Referência':'Reference','Comentários':'Comments',
  'Relacionamento afetivo':'Romantic relationship','Missão de vida':'Life purpose','Familiar':'Family','Profissional':'Professional','Financeiro':'Financial',
  'Jornada do terapeuta':'Practitioner workspace','Preparar uma vez. Trabalhe em quantas análises precisar.':'Prepare once. Work through as many analyses as needed.',
  'A preparação vale para seu período de trabalho. Faça várias avaliações, protocolos e tratamentos e encerre somente quando terminar as atividades do dia.':'Preparation applies to your work period. Complete as many assessments, protocols, and treatments as needed, and close only when you finish the day’s work.',
  'Preparar atividades':'Prepare work period','Preparação concluída':'Preparation complete','Nova análise':'New analysis','Encerrar o dia':'End the day',
  'Jornada de trabalho de hoje':'Today’s work journey','Nenhuma análise registrada ainda hoje':'No analyses recorded yet today','registro de análise/tratamento hoje':'analysis/treatment record today','registros de análise/tratamento hoje':'analysis/treatment records today',
  'Frequência vibracional atual':'Current vibrational frequency','Área que mais pede atenção':'Area needing the most attention','Ainda não aferida':'Not assessed yet','Não aferida':'Not assessed',
  'Preparação do dia':'Daily preparation','Aguardando preparação':'Waiting for preparation','Período preparado':'Work period prepared','Dia encerrado':'Day closed',
  'Preparar atividades':'Prepare work period','Iniciar uma análise ou sessão':'Start an analysis or session','Escolher investigação':'Choose investigation','Realizar tratamento':'Perform treatment','Reavaliar':'Reassess','Concluir e gerar relatório':'Finish and generate report','Continuar com outra análise ou encerrar o dia':'Continue with another analysis or end the day',
  'Preparar atividades':'Prepare work period','Encerrar atividades do dia':'End today’s work','Iniciar atividades':'Start work period','Cancelar':'Cancel','Observações':'Notes',
  'Centro e presença':'Centering and presence','Limpeza pessoal':'Personal cleansing','Proteção e limites':'Protection and boundaries','Conexão com o pêndulo':'Pendulum connection','Ambiente':'Environment','Intenção do período de trabalho':'Work-period intention','Estado emocional e ético':'Emotional and ethical state','Prontidão':'Readiness',
  'Revisão do dia':'Day review','Encerramento do campo de trabalho':'Closing the work field','Limpeza e centramento':'Cleansing and centering','Registros':'Records','Fechamento':'Closure',
  'Divórcio Energético':'Energetic Divorce','Iniciar Divórcio Energético':'Start Energetic Divorce','Tratamento geral':'General treatment','Corte geral':'General clearing','Tratamentos específicos':'Specific treatments','Finalização':'Completion',
  'Tema da sessão':'Session theme','Sessão individual':'Individual session','Sessão coletiva':'Group session','Áreas identificadas':'Identified areas','Reavaliar áreas':'Reassess areas',
  'Está 100% finalizado?':'Is it 100% complete?','O que precisa continuar?':'What needs to continue?','Salvar em PDF':'Save as PDF','Imprimir / Salvar PDF':'Print / Save PDF',
  'Histórico':'History','Sessões neste aparelho':'Sessions on this device','Limpar histórico':'Clear history','Fechar':'Close','O histórico está vazio.':'History is empty.',
  'Desenvolvido com amor por Taina Townsend — v1.3 • 18/08/2026':'Made with love by Taina Townsend — v1.3 • 18/08/2026',
  'Uso reflexivo/espiritual. Aspectos simbólicos são investigados dentro do sistema de crenças da pessoa; questões concretas também requerem medidas adequadas. Aferições relacionadas à saúde não substituem avaliação médica.':'Reflective/spiritual use. Symbolic aspects are explored within the person’s belief system; concrete issues also require appropriate measures. Health-related measurements do not replace medical evaluation.'
};
const WORDS=[
 ['avaliação','assessment'],['avaliações','assessments'],['investigação','investigation'],['investigações','investigations'],['tratamento','treatment'],['tratamentos','treatments'],['reequilibrar','rebalance'],['reequilíbrio','rebalancing'],['relatório','report'],['relatórios','reports'],['sessão','session'],['sessões','sessions'],['protocolo','protocol'],['protocolos','protocols'],['pergunta','question'],['perguntas','questions'],['resposta','answer'],['respostas','answers'],['causa raiz','root cause'],['causas raiz','root causes'],['desequilíbrio','imbalance'],['desequilíbrios','imbalances'],['percentual','percentage'],['campo','field'],['campos','fields'],['chakra','chakra'],['chakras','chakras'],['aura','aura'],['saúde','health'],['corpo físico','physical body'],['corpo','body'],['energia','energy'],['energético','energetic'],['energética','energetic'],['espiritual','spiritual'],['simbólico','symbolic'],['simbólica','symbolic'],['crença','belief'],['crenças','beliefs'],['limitante','limiting'],['limitantes','limiting'],['ancestralidade','ancestry'],['ancestral','ancestral'],['transgeracional','transgenerational'],['transgeracionais','transgenerational'],['voto','vow'],['votos','vows'],['pacto','pact'],['pactos','pacts'],['promessa','promise'],['promessas','promises'],['juramento','oath'],['juramentos','oaths'],['vínculo','bond'],['vínculos','bonds'],['financeiro','financial'],['financeira','financial'],['profissional','professional'],['carreira','career'],['relacionamento','relationship'],['relacionamentos','relationships'],['casamento','marriage'],['família','family'],['familiares','family'],['merecimento','worthiness'],['autoestima','self-esteem'],['prosperidade','prosperity'],['abundância','abundance'],['propósito','purpose'],['criatividade','creativity'],['projeto','project'],['projetos','projects'],['parentalidade','parenting'],['pertencimento','belonging'],['medo','fear'],['culpa','guilt'],['raiva','anger'],['tristeza','sadness'],['luto','grief'],['ansiedade','anxiety'],['autossabotagem','self-sabotage'],['rejeição','rejection'],['abandono','abandonment'],['injustiça','injustice'],['humilhação','humiliation'],['escassez','scarcity'],['bloqueio','block'],['bloqueios','blocks'],['memória','memory'],['memórias','memories'],['sexual','sexual'],['lealdade','loyalty'],['comunicação','communication'],['origem','origin'],['interno','internal'],['interna','internal'],['externo','external'],['externa','external'],['padrão','pattern'],['padrões','patterns'],['comportamento','behavior'],['comportamentos','behaviors'],['emoção','emotion'],['emoções','emotions'],['experiência','experience'],['experiências','experiences'],['segurança','safety'],['confiança','trust'],['limites','boundaries'],['direção','direction'],['decisão','decision'],['decisões','decisions'],['controle','control'],['sacrifício','sacrifice'],['sofrimento','suffering'],['perda','loss'],['perdas','losses'],['dívida','debt'],['dívidas','debts'],['renda','income'],['despesas','expenses'],['planejamento','planning'],['oportunidade','opportunity'],['oportunidades','opportunities'],['recursos','resources'],['objetivo','goal'],['objetivos','goals'],['prática','practice'],['terapeuta','practitioner'],['cliente','client'],['clientes','clients'],['participante','participant'],['participantes','participants'],['individual','individual'],['coletivo','group'],['coletiva','group'],['tempo','time'],['gráfico','chart'],['gráficos','charts'],['comando','command'],['observações','notes'],['resultado','result'],['resultados','results'],['antes','before'],['depois','after'],['hoje','today'],['dia','day'],['dias','days'],['horas','hours'],['minutos','minutes'],['semanas','weeks'],['meses','months']
];
const SENTENCE_RULES=[
 [/^Há\s+/i,'Is there '],[/^Existe\s+/i,'Is there '],[/^Existem\s+/i,'Are there '],[/^Esse\s+/i,'Does this '],[/^Essa\s+/i,'Does this '],[/^Este\s+/i,'Does this '],[/^Esta\s+/i,'Does this '],[/^Esses\s+/i,'Do these '],[/^Essas\s+/i,'Do these '],[/^O\s+/i,'Does the '],[/^A\s+/i,'Does the '],
 [/\bque\b/gi,'that'],[/\bestá\b/gi,'is'],[/\bestão\b/gi,'are'],[/\bfoi\b/gi,'was'],[/\bforam\b/gi,'were'],[/\bpode\b/gi,'can'],[/\bpodem\b/gi,'can'],[/\bprecisa\b/gi,'needs to'],[/\bprecisam\b/gi,'need to'],[/\bdeve\b/gi,'should'],[/\bdevem\b/gi,'should'],[/\brelacionado\b/gi,'related'],[/\brelacionada\b/gi,'related'],[/\brelacionados\b/gi,'related'],[/\brelacionadas\b/gi,'related'],[/\bcom\b/gi,'with'],[/\bsem\b/gi,'without'],[/\bpara\b/gi,'for'],[/\bpor\b/gi,'by'],[/\bentre\b/gi,'between'],[/\bou\b/gi,'or'],[/\be\b/gi,'and'],[/\bnesta\b/gi,'in this'],[/\bneste\b/gi,'in this'],[/\bnessa\b/gi,'in that'],[/\bnesse\b/gi,'in that'],[/\bdessa\b/gi,'of this'],[/\bdesse\b/gi,'of this'],[/\bda\b/gi,'of the'],[/\bdo\b/gi,'of the'],[/\bdas\b/gi,'of the'],[/\bdos\b/gi,'of the'],[/\buma\b/gi,'a'],[/\bum\b/gi,'a']
];
function escRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function translateText(input){
 if(!input||typeof input!=='string')return input;
 const trimmed=input.trim();
 if(EXACT[trimmed])return input.replace(trimmed,EXACT[trimmed]);
 let out=input;
 WORDS.sort((a,b)=>b[0].length-a[0].length).forEach(([pt,en])=>{out=out.replace(new RegExp('\\b'+escRe(pt)+'\\b','gi'),en)});
 SENTENCE_RULES.forEach(([r,v])=>{out=out.replace(r,v)});
 return out.replace(/\s{2,}/g,' ');
}
function translateSelectOptions(root){root.querySelectorAll?.('option').forEach(o=>{if(!o.dataset.ptOriginal)o.dataset.ptOriginal=o.textContent;o.textContent=translateText(o.dataset.ptOriginal)})}
function translateAttributes(root){
 root.querySelectorAll?.('[placeholder]').forEach(el=>{if(!el.dataset.ptPlaceholder)el.dataset.ptPlaceholder=el.placeholder;el.placeholder=translateText(el.dataset.ptPlaceholder)});
 root.querySelectorAll?.('[aria-label]').forEach(el=>{if(!el.dataset.ptAria)el.dataset.ptAria=el.getAttribute('aria-label');el.setAttribute('aria-label',translateText(el.dataset.ptAria))});
 root.querySelectorAll?.('[title]').forEach(el=>{if(!el.dataset.ptTitle)el.dataset.ptTitle=el.getAttribute('title');el.setAttribute('title',translateText(el.dataset.ptTitle))});
}
function translateDOM(root=document.body){
 if(running||localStorage.getItem(LANG_KEY)!=='en')return;running=true;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 nodes.forEach(n=>{const p=n.parentElement;if(!p||['SCRIPT','STYLE','TEXTAREA','OPTION'].includes(p.tagName))return;const s=n.nodeValue;if(!s||!s.trim())return;if(!n.__lumeraPt)n.__lumeraPt=s;n.nodeValue=translateText(n.__lumeraPt)});
 translateSelectOptions(root);translateAttributes(root);running=false;
}
function restoreDOM(root=document.body){
 running=true;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;if(n.__lumeraPt){n.nodeValue=n.__lumeraPt;delete n.__lumeraPt}}
 root.querySelectorAll?.('option[data-pt-original]').forEach(o=>{o.textContent=o.dataset.ptOriginal;delete o.dataset.ptOriginal});
 root.querySelectorAll?.('[data-pt-placeholder]').forEach(el=>{el.placeholder=el.dataset.ptPlaceholder;delete el.dataset.ptPlaceholder});
 root.querySelectorAll?.('[data-pt-aria]').forEach(el=>{el.setAttribute('aria-label',el.dataset.ptAria);delete el.dataset.ptAria});
 root.querySelectorAll?.('[data-pt-title]').forEach(el=>{el.setAttribute('title',el.dataset.ptTitle);delete el.dataset.ptTitle});running=false;
}
function translateData(){
 if(localStorage.getItem(LANG_KEY)!=='en'||!window.DATA||!window.PLANS)return;
 if(!window.__lumeraDataPt){try{window.__lumeraDataPt={DATA:JSON.parse(JSON.stringify(DATA)),PLANS:JSON.parse(JSON.stringify(PLANS))}}catch(e){return}}
 const src=window.__lumeraDataPt;
 Object.keys(DATA).forEach(k=>delete DATA[k]);Object.assign(DATA,JSON.parse(JSON.stringify(src.DATA)));
 Object.keys(PLANS).forEach(k=>delete PLANS[k]);Object.assign(PLANS,JSON.parse(JSON.stringify(src.PLANS)));
 Object.values(DATA).forEach(p=>{if(p.title)p.title=translateText(p.title);if(p.copy)p.copy=translateText(p.copy);(p.questions||[]).forEach(q=>{if(q.q)q.q=translateText(q.q);if(q.section)q.section=translateText(q.section)})});
 Object.values(PLANS).forEach(p=>{if(p.label)p.label=translateText(p.label);if(p.command)p.command=translateText(p.command)});
}
function apply(){if(localStorage.getItem(LANG_KEY)==='en'){translateData();translateDOM();document.documentElement.lang='en'}else{restoreDOM();document.documentElement.lang='pt-BR'}}
function install(){
 apply();
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-lang]');if(!b)return;setTimeout(()=>{if(b.dataset.lang==='en'){translateData();translateDOM()}else restoreDOM()},60)});
 let timer;new MutationObserver(m=>{if(localStorage.getItem(LANG_KEY)!=='en'||running)return;clearTimeout(timer);timer=setTimeout(()=>{m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1)translateDOM(n);else if(n.nodeType===3&&n.parentElement)translateDOM(n.parentElement)}));translateDOM()},20)}).observe(document.body,{childList:true,subtree:true});
 window.addEventListener('storage',apply);document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();