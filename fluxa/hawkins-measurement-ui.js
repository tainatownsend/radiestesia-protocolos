import { createStore } from './store.js';
import { getOpenSession,latestPreparation } from './domain.js';
import { hawkinsBaseline,recordHawkinsBaseline,linkTreatmentHawkinsBaseline,enrichFinalHawkinsAssessment,validateHawkinsHertz } from './hawkins-measurement.js';

const store=createStore();let enhancing=false;let pendingTreatmentLink=null;let pendingFinalLink=null;
const START_SELECTOR='[data-start-root-protocol],[data-start-root-by-title],[data-start-branching],[data-start-quick-investigation],[data-open-divorce-energy]';
function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function context(){const state=store.getState(),session=getOpenSession(state),assisted=state.assistedEntities.find(item=>item.id===session?.currentAssistedEntityId);return {state,session,assisted,baseline:session&&assisted?hawkinsBaseline(state,session.id,assisted.id):null};}
function baselineCard({session,assisted,baseline},compact=false,options={}){
  if(!session||!assisted)return '';
  if(baseline)return `<section class="hawkins-measurement-card ${compact?'compact':''}" data-hawkins-baseline-card><div><p class="eyebrow">Medição inicial</p><strong>Frequência vibracional de Hawkins</strong><p>${esc(baseline.hertz)} Hz · registrada nesta sessão</p></div><span class="status-pill">Registrada</span></section>`;
  const link=options.treatmentId?` data-link-treatment="${esc(options.treatmentId)}"`:'';const resume=options.resumePlanned?` data-resume-planned-start="${esc(options.treatmentId)}"`:'';
  return `<section class="hawkins-measurement-card ${compact?'compact':''}" data-hawkins-baseline-card><div><p class="eyebrow">Medição inicial obrigatória</p><strong>Frequência vibracional de Hawkins</strong><p>Registre a frequência em Hz antes de iniciar a investigação ou o tratamento.</p></div><form data-hawkins-baseline-form data-session="${esc(session.id)}" data-assisted="${esc(assisted.id)}"${link}${resume}><label><span>Frequência</span><span class="hawkins-input"><input name="hertz" type="number" min="0.01" step="any" inputmode="decimal" required placeholder="Ex.: 540"><b>Hz</b></span></label><button class="btn primary" type="submit">Registrar</button></form></section>`;
}
function enhanceChooser(){
  const sheet=document.querySelector('#investigation-chooser-overlay .sheet');if(!sheet||sheet.querySelector('[data-hawkins-baseline-card]'))return;
  const ctx=context();if(!ctx.session||!ctx.assisted)return;
  const anchor=sheet.querySelector('.therapeutic-witness-note')||sheet.querySelector('.protocol-discovery');if(!anchor)return;
  const holder=document.createElement('div');holder.innerHTML=baselineCard(ctx);anchor.after(holder.firstElementChild);
}
function enhanceTreatmentForm(){
  const form=document.querySelector('#treatment-form');if(!form||form.querySelector('[data-hawkins-baseline-card]'))return;
  const items=form.querySelector('[data-treatment-items]');if(!items)return;
  const ctx=context();if(!ctx.session||!ctx.assisted)return;
  const holder=document.createElement('div');holder.innerHTML=baselineCard(ctx,true);const section=holder.firstElementChild;
  const modality=form.querySelector('[data-treatment-modality-picker]');(modality||items).before(section);
}
function enhanceFinalForm(){
  const form=document.querySelector('#final-assessment-form,#final-cycle-form');if(!form||form.dataset.hawkinsEnhanced)return;form.dataset.hawkinsEnhanced='true';const input=form.querySelector('[name="frequency"]');if(!input)return;input.type='number';input.min='0.01';input.step='any';input.inputMode='decimal';input.placeholder='Ex.: 540';const field=input.closest('.field');const label=field?.querySelector('label');if(label)label.textContent='Frequência vibracional de Hawkins (Hz)';field?.querySelector('.hawkins-helper')?.remove();const helper=document.createElement('small');helper.className='muted hawkins-helper';helper.textContent='Medição final obrigatória do tratamento.';field?.appendChild(helper);
}
function openPlannedBaseline(treatmentId,ctx){
  document.querySelector('#hawkins-planned-overlay')?.remove();const wrap=document.createElement('div');wrap.id='hawkins-planned-overlay';wrap.className='modal-backdrop';wrap.innerHTML=`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Antes de iniciar</p><h2>Medição inicial</h2></div><button class="close-btn" type="button" data-close-hawkins-planned>×</button></div>${baselineCard(ctx,true,{treatmentId,resumePlanned:true})}</section>`;document.body.appendChild(wrap);requestAnimationFrame(()=>wrap.querySelector('[name="hertz"]')?.focus());
}
function enhance(){if(enhancing)return;enhancing=true;try{enhanceChooser();enhanceTreatmentForm();enhanceFinalForm();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);store.subscribe(()=>queueMicrotask(enhance));

document.addEventListener('submit',event=>{
  const form=event.target;
  if(form.matches('[data-hawkins-baseline-form]')){event.preventDefault();event.stopImmediatePropagation();try{const data=new FormData(form),assessment=recordHawkinsBaseline(store,{sessionId:form.dataset.session,assistedEntityId:form.dataset.assisted,hertz:data.get('hertz')});if(form.dataset.linkTreatment)linkTreatmentHawkinsBaseline(store,form.dataset.linkTreatment,assessment.id);const resumeId=form.dataset.resumePlannedStart;form.closest('[data-hawkins-baseline-card]')?.remove();document.querySelector('#hawkins-planned-overlay')?.remove();queueMicrotask(enhance);if(resumeId)requestAnimationFrame(()=>document.querySelector(`[data-start-planned-treatment="${CSS.escape(resumeId)}"]`)?.click());}catch(error){alert(error.message);}return;}
  if(form.id==='treatment-form'){
    const ctx=context();if(!ctx.session||!ctx.assisted)return;
    let baseline=ctx.baseline;
    if(!baseline){const input=form.querySelector('[data-hawkins-baseline-form] [name="hertz"]');try{baseline=recordHawkinsBaseline(store,{sessionId:ctx.session.id,assistedEntityId:ctx.assisted.id,hertz:input?.value});}catch(error){event.preventDefault();event.stopImmediatePropagation();alert(error.message);input?.focus();return;}}
    pendingTreatmentLink={assessmentId:baseline.id,beforeIds:new Set(store.getState().treatments.map(item=>item.id)),assistedEntityId:ctx.assisted.id};
    queueMicrotask(()=>{const pending=pendingTreatmentLink;pendingTreatmentLink=null;if(!pending)return;const created=store.getState().treatments.filter(item=>item.assistedEntityId===pending.assistedEntityId&&!pending.beforeIds.has(item.id)).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0];if(created)try{linkTreatmentHawkinsBaseline(store,created.id,pending.assessmentId);}catch(error){console.error(error);}});
    return;
  }
  if(['final-assessment-form','final-cycle-form'].includes(form.id)){
    const input=form.querySelector('[name="frequency"]');try{validateHawkinsHertz(input?.value);}catch(error){event.preventDefault();event.stopImmediatePropagation();alert(error.message);input?.focus();return;}
    const treatmentId=form.dataset.treatment||null,beforeIds=new Set(store.getState().assessments.map(item=>item.id));pendingFinalLink={treatmentId,beforeIds};queueMicrotask(()=>{const pending=pendingFinalLink;pendingFinalLink=null;if(!pending)return;const created=store.getState().assessments.filter(item=>!pending.beforeIds.has(item.id)&&(!pending.treatmentId||item.treatmentId===pending.treatmentId)).sort((a,b)=>String(b.occurredAt||'').localeCompare(String(a.occurredAt||'')))[0];if(created)try{enrichFinalHawkinsAssessment(store,created.id);}catch(error){console.error(error);}});
  }
},true);

document.addEventListener('click',event=>{
  const button=event.target.closest?.('button');if(!button)return;
  if(button.dataset.closeHawkinsPlanned!==undefined){document.querySelector('#hawkins-planned-overlay')?.remove();return;}
  if(button.dataset.startPlannedTreatment){const state=store.getState(),treatment=state.treatments.find(item=>item.id===button.dataset.startPlannedTreatment),ctx=context();if(!treatment||!ctx.session||!ctx.assisted||latestPreparation(state,ctx.session.id)?.status!=='COMPLETED'||treatment.assistedEntityId!==ctx.assisted.id)return;if(ctx.baseline){if(!treatment.hawkinsBaselineAssessmentId)try{linkTreatmentHawkinsBaseline(store,treatment.id,ctx.baseline.id);}catch(error){event.preventDefault();event.stopImmediatePropagation();alert(error.message);}return;}event.preventDefault();event.stopImmediatePropagation();openPlannedBaseline(treatment.id,ctx);return;}
  if(!button.matches(START_SELECTOR))return;const overlay=button.closest('#investigation-chooser-overlay');if(!overlay)return;const ctx=context();if(!ctx.session||!ctx.assisted||latestPreparation(ctx.state,ctx.session.id)?.status!=='COMPLETED')return;if(ctx.baseline)return;event.preventDefault();event.stopImmediatePropagation();alert('Registre a frequência vibracional de Hawkins em Hz antes de iniciar a investigação.');overlay.querySelector('[data-hawkins-baseline-form] [name="hertz"]')?.focus();
},true);
