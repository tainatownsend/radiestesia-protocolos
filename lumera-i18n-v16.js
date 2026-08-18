(function(){
'use strict';
const KEY='lumera_language_v13';
const dict={
 pt:{
  'app.title':'Lumera — Radiestesia Terapêutica','nav.history':'Histórico','nav.home':'Início',
  'home.eyebrow':'Lumera • Workspace terapêutico','home.title':'O que você quer fazer agora?','home.copy':'Escolha um fluxo. A preparação do terapeuta vale para o período de trabalho e permanece separada das análises individuais.',
  'action.assessment':'Nova avaliação','action.assessment.copy':'Avaliação inicial completa','action.protocol':'Iniciar investigação','action.protocol.copy':'Abrir biblioteca de protocolos','action.divorce':'Divórcio Energético','action.divorce.copy':'Fluxo individual ou coletivo','action.quick':'Sessão rápida','action.quick.copy':'Reequilíbrio sem investigação extensa','action.history':'Clientes e histórico','action.practitioner':'Jornada do terapeuta',
  'library.title':'Biblioteca de Protocolos','library.copy':'Busque por tema ou escolha uma categoria.','library.search':'Buscar protocolo…','library.all':'Todos','library.resources':'Dinheiro & carreira','library.relations':'Relacionamentos','library.self':'Eu & bem-estar','library.quick':'Sessões rápidas','library.master':'Mestre','library.empty':'Nenhum protocolo encontrado.','library.close':'Fechar biblioteca','library.unsure':'Não sabe qual escolher?','library.unsure.copy':'O Protocolo Mestre investiga diferentes tipos de causa sem exigir uma área prévia.','library.openMaster':'Abrir Mestre',
  'resume.title':'Continuar de onde parei','resume.assessment':'Retomar avaliação','resume.divorce':'Retomar Divórcio Energético','resume.protocol':'Retomar investigação','sessionMode.on':'Modo Sessão','sessionMode.off':'Sair do modo sessão',
  'status.loading':'Abrindo…','status.unavailable':'Este fluxo ainda não terminou de carregar. Tente novamente em um instante.','status.error':'Não foi possível abrir este fluxo. Volte ao início e tente novamente.','a11y.main':'Conteúdo principal do Lumera',
  'footer.credit':'Desenvolvido com amor por Taina Townsend — v1.6 • 18/08/2026'
 },
 en:{
  'app.title':'Lumera — Therapeutic Radiesthesia','nav.history':'History','nav.home':'Home',
  'home.eyebrow':'Lumera • Therapeutic workspace','home.title':'What would you like to do now?','home.copy':'Choose a workflow. Practitioner preparation applies to the work period and remains separate from individual analyses.',
  'action.assessment':'New assessment','action.assessment.copy':'Complete initial assessment','action.protocol':'Start investigation','action.protocol.copy':'Open protocol library','action.divorce':'Energetic Divorce','action.divorce.copy':'Individual or group workflow','action.quick':'Quick session','action.quick.copy':'Rebalancing without deep investigation','action.history':'Clients & history','action.practitioner':'Practitioner journey',
  'library.title':'Protocol Library','library.copy':'Search by topic or choose a category.','library.search':'Search protocols…','library.all':'All','library.resources':'Money & career','library.relations':'Relationships','library.self':'Self & wellbeing','library.quick':'Quick sessions','library.master':'Master','library.empty':'No protocols found.','library.close':'Close library','library.unsure':'Not sure which one to choose?','library.unsure.copy':'The Master Protocol explores different types of causes without requiring a predefined area.','library.openMaster':'Open Master',
  'resume.title':'Continue where I left off','resume.assessment':'Resume assessment','resume.divorce':'Resume Energetic Divorce','resume.protocol':'Resume investigation','sessionMode.on':'Session Mode','sessionMode.off':'Exit session mode',
  'status.loading':'Opening…','status.unavailable':'This workflow is still loading. Try again in a moment.','status.error':'This workflow could not be opened. Return home and try again.','a11y.main':'Lumera main content',
  'footer.credit':'Made with love by Taina Townsend — v1.6 • 18/08/2026'
 }
};
function locale(){return localStorage.getItem(KEY)==='en'?'en':'pt'}
function t(key,vars){let s=(dict[locale()]&&dict[locale()][key])||dict.pt[key]||key;Object.entries(vars||{}).forEach(([k,v])=>s=s.replaceAll('{'+k+'}',String(v)));return s}
function setLocale(next){const lang=next==='en'?'en':'pt';localStorage.setItem(KEY,lang);document.documentElement.lang=lang==='en'?'en':'pt-BR';window.dispatchEvent(new CustomEvent('lumera:languagechange',{detail:{lang}}));}
function register(lang,values){if(!dict[lang])dict[lang]={};Object.assign(dict[lang],values||{})}
window.LumeraI18n={t,locale,setLocale,register,dict,version:'1.6'};
})();
