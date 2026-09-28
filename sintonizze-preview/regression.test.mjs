import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
function app(saved){
 const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'https://sintonizze.test/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};w.confirm=()=>true;w.print=()=>{};if(saved)for(const [k,v]of Object.entries(saved))w.localStorage.setItem(k,v);}});
 const w=dom.window,d=w.document;
 const click=selector=>{const e=d.querySelector(selector);assert.ok(e,`Missing ${selector}`);e.click();return e;};
 const input=(selector,value,event='input')=>{const e=d.querySelector(selector);assert.ok(e,`Missing ${selector}`);e.value=value;e.dispatchEvent(new w.Event(event,{bubbles:true}));};
 const data=()=>JSON.parse(w.localStorage.getItem([...Object.keys(w.localStorage)].find(k=>w.localStorage.getItem(k).includes('protocols'))));
 return {dom,w,d,errors,click,input,data,close:()=>w.close()};
}
function direct(a){a.click('[data-v42="quick-treat"]');a.click('[data-v42="session-continue"]');a.click('[data-v42="add-focus"]');a.click('[data-v42="add-component"]');a.click('[data-v42="choose-component-type"][data-type="graph"]');a.click('[data-v42="choose-graph"]');}
test('whole HTML initializes every extension and Assistidos CRUD survives reload',()=>{
 const a=app();assert.deepEqual(a.errors,[]);a.click('[data-nav="subject-list"]');a.click('[data-v423="new"]');
 a.input('input[name="name"]','QA Casa');a.input('select[name="kind"]','Imóvel','change');a.d.querySelector('form').requestSubmit();
 assert.ok(a.data().v421Subjects.some(s=>s.name==='QA Casa'));
 const saved=Object.fromEntries(Object.keys(a.w.localStorage).map(k=>[k,a.w.localStorage.getItem(k)]));a.close();const b=app(saved);b.click('[data-nav="subject-list"]');assert.match(b.d.body.textContent,/QA Casa/);assert.deepEqual(b.errors,[]);b.close();
});
test('category/favorite/recent filters, treatment persistence and component draft edits',()=>{
 const a=app();a.click('[data-nav="graphs"]');a.click('[data-v42="graph-filter"][data-value="cat-prosperity"]');assert.equal(a.d.querySelectorAll('.v42-graph').length,1);
 a.click('[data-nav="home"]');direct(a);a.input('#v42ComponentNote','Preservar esta nota');a.input('#v42DurationValue','14');a.click('[data-v42="witness-mode"][data-value="witness"]');assert.equal(a.d.querySelector('#v42ComponentNote').value,'Preservar esta nota');assert.equal(a.d.querySelector('#v42DurationValue').value,'14');a.click('[data-v42="save-component"]');
 let t=a.data().v42Treatments[0],c=t.focuses[0].components[0];assert.ok(c.dueAt);const cid=c.id;
 a.click('[data-v42="edit-component"]');a.input('#v42ComponentNote','Editada');a.click('[data-v42="save-component"]');assert.equal(a.data().v42Treatments[0].focuses[0].components[0].id,cid);
 a.click('[data-v42="save-treatment"]');assert.match(a.d.body.textContent,/Novo tratamento/);assert.equal(a.d.querySelectorAll('[data-v426="open-treatment"]').length,1);
 a.click('[data-v426="open-treatment"]');a.click('[data-v42="add-component"]');a.click('[data-v42="choose-component-type"][data-type="graph"]');a.click('[data-v42="graph-filter"][data-value="recent"]');assert.equal(a.d.querySelectorAll('[data-v42="choose-graph"]').length,1);assert.deepEqual(a.errors,[]);a.close();
});
test('empty baseline, percent gating, finish, print, re-evaluation and immutable original',()=>{
 const a=app();a.click('[data-v42="quick-investigate"]');a.click('[data-v42="session-continue"]');a.click('[data-v42="choose-route"]');assert.equal(a.d.querySelector('#v42Bovis').value,'');assert.equal(a.d.querySelector('#v42Hawkins').value,'');
 a.input('#v42Hawkins','250','change');a.input('#v42Bovis','10000');a.click('[data-v42="begin-investigation"]');assert.ok(a.d.querySelector('#answerPct').disabled);
 let steps=0;while(a.d.querySelector('[data-answer="nao"]')&&steps++<20){a.click('[data-answer="nao"]');a.click('[data-action="next-question"]');}
 const original=a.data().sessions[0];assert.equal(original.status,'done');assert.ok(original.subjectId);assert.equal(original.baseline.bovis,10000);assert.ok(Object.values(original.answers).every(x=>!('pct'in x)));
 a.click('[data-action="print"]');assert.match(a.d.querySelector('.print-sheet').textContent,/Hawkins/);assert.match(a.d.querySelector('.print-sheet').textContent,/10.000/);a.click('[data-print-v4="back"]');
 a.click('[data-v42="treatment-from-report"]');assert.equal(a.data().v42Treatments[0].assistidoId,original.subjectId);
 a.click('[data-nav="sessions"]');assert.equal(a.d.querySelector('.v4-summary-strip div:last-child strong').textContent,'1');assert.match(a.d.body.textContent,/Investigação \+ tratamento/);a.click('[data-action="reassess"]');assert.equal(a.d.querySelector('#v42Bovis').value,'');a.click('[data-v42="begin-investigation"]');assert.equal(a.data().sessions[0].reevalOf,original.id);assert.deepEqual(a.data().sessions.find(s=>s.id===original.id),original);assert.deepEqual(a.errors,[]);a.close();
});
test('indefinite duration and completed treatment are preserved',()=>{
 const a=app();direct(a);a.click('[data-v426="duration-mode"][data-value="review"]');a.click('[data-v42="save-component"]');assert.equal(a.data().v42Treatments[0].focuses[0].components[0].dueAt,null);assert.match(a.d.body.textContent,/Até reavaliar/);
 a.click('[data-v426="treatment-status"][data-value="done"]');assert.equal(a.data().v42Treatments[0].status,'done');assert.ok(a.d.querySelector('[data-v42="add-focus"]').disabled);a.click('[data-nav="treatments"]');assert.match(a.d.body.textContent,/Concluído/);assert.deepEqual(a.errors,[]);a.close();
});
test('new graph from picker returns to component, preserving draft and both focuses',()=>{
 const a=app();direct(a);a.input('#v42ComponentNote','Nota conservada');a.click('[data-nav="graph-picker"]');a.click('[data-v42="new-graph-picker"]');a.input('input[name="name"]','Gráfico QA');a.d.querySelector('#v42GraphForm').requestSubmit();assert.ok(a.d.querySelector('#v42ComponentNote'));assert.equal(a.d.querySelector('#v42ComponentNote').value,'Nota conservada');a.click('[data-v42="save-component"]');a.click('[data-v42="add-focus"]');assert.equal(a.data().v42Treatments[0].focuses.length,2);assert.equal(a.data().v42Treatments[0].focuses[0].components[0].name,'Gráfico QA');assert.deepEqual(a.errors,[]);a.close();
});
test('subject rename retains sessions and overdue component appears in Hoje',()=>{
 const a=app();direct(a);a.click('[data-v42="save-component"]');const state=a.data();const t=state.v42Treatments[0],sub=state.v421Subjects.find(s=>s.id===t.assistidoId);t.focuses[0].components[0].dueAt='2020-01-01T00:00:00Z';state.sessions.push({id:'qa-old',protocolId:'qa',protocolTitle:'Histórico QA',subjectId:sub.id,context:sub.name,created:'2020-01-01',updated:'2020-01-01',status:'done',answers:{},treatments:[]});
 const key=Object.keys(a.w.localStorage).find(k=>a.w.localStorage.getItem(k).includes('protocols'));a.close();const b=app({[key]:JSON.stringify(state)});assert.match(b.d.body.textContent,/Para verificar/);b.click('[data-nav="subject-list"]');b.click(`[data-v423="edit"][data-id="${sub.id}"]`);b.input('input[name="name"]','Nome atualizado');b.d.querySelector('form').requestSubmit();b.click(`[data-v423="open"][data-id="${sub.id}"]`);assert.match(b.d.body.textContent,/Histórico QA/);assert.deepEqual(b.errors,[]);b.close();
});
