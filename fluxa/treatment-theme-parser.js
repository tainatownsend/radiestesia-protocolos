function decode(value=''){return String(value).replace(/\\n/g,'\n').replace(/\\'/g,"'").replace(/\\"/g,'"').replace(/\\\\/g,'\\');}

export function normalizeTreatmentThemeText(value=''){
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

export function matchesTreatmentThemeSearch(searchText='',query=''){
  const haystack=normalizeTreatmentThemeText(searchText);
  const terms=normalizeTreatmentThemeText(query).split(/\s+/).filter(Boolean);
  return terms.every((term)=>haystack.includes(term));
}

export function inferTreatmentTheme(title='',command=''){
  const text=normalizeTreatmentThemeText(`${title} ${command}`);
  const rules=[
    ['Financeiro',['finance','dinheiro','prosper','escassez','material','receber','cobrar','dívida','divida']],
    ['Carreira',['carreira','profission','trabalho','liderança','lideranca','sucesso','reconhecimento']],
    ['Relacionamentos',['relacion','casamento','afetiv','amor','parceir','conflito','separação','separacao']],
    ['Parentalidade',['matern','patern','filho','filha','criança','crianca','cuidadores','sobrecarga parental']],
    ['Família e ancestralidade',['famil','ancestr','transger','parental','linhagem','lealdade','mãe','mae','pai']],
    ['Autoestima e identidade',['autoestima','amor-próprio','amor proprio','merecimento','identidade','autovalor','rejeição','rejeicao','aprovação','aprovacao']],
    ['Corpo e autoimagem',['corpo','autoimagem','vergonha corporal','imagem corporal','aparência','aparencia']],
    ['Casa e ambiente',['casa','ambiente','lar','espaço','espaco','moradia']],
    ['Vida social e pertencimento',['social','pertencimento','amizade','amigos','isolamento','grupo','confiança social','confianca social']],
    ['Propósito e criatividade',['propósito','proposito','missão','missao','criativ','projeto','caminho de vida']],
    ['Ciclos e transições',['encerramento','fechamento','transição','transicao','mudança','mudanca','novo ciclo','fim de ciclo','decisão','decisao']],
    ['Energia e padrões',['energ','vínculo','vinculo','cordão','cordao','padrão','padrao','kárm','karm','voto','pacto','crença','crenca']]
  ];
  return rules.find(([,terms])=>terms.some(term=>text.includes(normalizeTreatmentThemeText(term))))?.[0]||'Outros temas';
}

export function parseTreatmentPlans(source,path){
  const items=[];
  const add=(legacyId,title,command)=>{
    title=decode(title);command=decode(command);
    if(!title||!command)return;
    items.push({id:`${path}:${legacyId}`,legacyId,title,command,theme:inferTreatmentTheme(title,command),sourcePath:path,search:normalizeTreatmentThemeText(`${title} ${command}`)});
  };
  const callRe=/([A-Za-z0-9_]+)\s*:\s*(?:C|P)\(\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'\s*\)/g;
  for(const match of source.matchAll(callRe))add(match[1],match[2],match[3]);
  const objectRe=/([A-Za-z0-9_]+)\s*:\s*\{\s*label\s*:\s*'((?:\\.|[^'])*)'\s*,\s*command\s*:\s*'((?:\\.|[^'])*)'\s*\}/g;
  for(const match of source.matchAll(objectRe))add(match[1],match[2],match[3]);
  return items;
}
