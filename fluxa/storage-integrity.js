function asArray(value){return Array.isArray(value)?value:[];}
function idSet(items,name){
  const ids=new Set();
  for(const item of asArray(items)){
    const id=String(item?.id||'').trim();
    if(!id)throw new Error(`Backup inválido: há registro sem id em ${name}.`);
    if(ids.has(id))throw new Error(`Backup inválido: id duplicado em ${name}: ${id}.`);
    ids.add(id);
  }
  return ids;
}
function requireRef(value,ids,label){if(value!=null&&value!==''&&!ids.has(String(value)))throw new Error(`Backup inválido: ${label} aponta para um registro inexistente (${value}).`);}

export function validateStateReferences(state={}){
  const sessions=idSet(state.sessions,'sessions');
  const assisted=idSet(state.assistedEntities,'assistedEntities');
  const investigations=idSet(state.investigations,'investigations');
  const findings=idSet(state.findings,'findings');
  const treatments=idSet(state.treatments,'treatments');
  const treatmentComponents=idSet(state.treatmentComponents,'treatmentComponents');
  const assessments=idSet(state.assessments,'assessments');
  idSet(state.events,'events');
  idSet(state.preparationRuns,'preparationRuns');
  idSet(state.closingRuns,'closingRuns');
  idSet(state.componentReviews,'componentReviews');
  idSet(state.treatmentReviews,'treatmentReviews');
  idSet(state.reikiApplications,'reikiApplications');
  idSet(state.tools,'tools');
  idSet(state.customProtocols,'customProtocols');

  for(const session of asArray(state.sessions))requireRef(session.currentAssistedEntityId,assisted,'Session.currentAssistedEntityId');
  for(const run of asArray(state.preparationRuns))requireRef(run.sessionId,sessions,'PreparationRun.sessionId');
  for(const run of asArray(state.closingRuns))requireRef(run.sessionId,sessions,'ClosingRun.sessionId');

  const investigationById=new Map(asArray(state.investigations).map((item)=>[String(item.id),item]));
  for(const investigation of asArray(state.investigations)){
    requireRef(investigation.assistedEntityId,assisted,'Investigation.assistedEntityId');
    requireRef(investigation.originSessionId,sessions,'Investigation.originSessionId');
    requireRef(investigation.currentSessionId,sessions,'Investigation.currentSessionId');
    requireRef(investigation.sessionId,sessions,'Investigation.sessionId');
  }

  for(const finding of asArray(state.findings)){
    requireRef(finding.investigationId,investigations,'Finding.investigationId');
    requireRef(finding.assistedEntityId,assisted,'Finding.assistedEntityId');
    const investigation=investigationById.get(String(finding.investigationId));
    if(investigation?.assistedEntityId&&finding.assistedEntityId&&investigation.assistedEntityId!==finding.assistedEntityId){
      throw new Error(`Backup inválido: o achado ${finding.id} pertence a um Assistido diferente de sua investigação.`);
    }
  }

  const assessmentById=new Map(asArray(state.assessments).map((item)=>[String(item.id),item]));
  const treatmentById=new Map(asArray(state.treatments).map((item)=>[String(item.id),item]));
  const componentById=new Map(asArray(state.treatmentComponents).map((item)=>[String(item.id),item]));
  const recommendationClaimByAssessmentId=new Map();
  for(const treatment of asArray(state.treatments)){
    requireRef(treatment.assistedEntityId,assisted,'Treatment.assistedEntityId');
    requireRef(treatment.originSessionId,sessions,'Treatment.originSessionId');
    requireRef(treatment.previousTreatmentId,treatments,'Treatment.previousTreatmentId');
    requireRef(treatment.recommendedByAssessmentId,assessments,'Treatment.recommendedByAssessmentId');
    if(treatment.previousTreatmentId===treatment.id)throw new Error(`Backup inválido: o tratamento ${treatment.id} não pode apontar para si próprio como ciclo anterior.`);
    const previous=treatmentById.get(String(treatment.previousTreatmentId));
    if(previous?.assistedEntityId&&treatment.assistedEntityId&&previous.assistedEntityId!==treatment.assistedEntityId){
      throw new Error(`Backup inválido: o tratamento ${treatment.id} aponta para ciclo anterior de outro Assistido.`);
    }
    if(treatment.recommendedByAssessmentId){
      const recommendation=assessmentById.get(String(treatment.recommendedByAssessmentId));
      if(recommendation?.assistedEntityId&&treatment.assistedEntityId&&recommendation.assistedEntityId!==treatment.assistedEntityId){
        throw new Error(`Backup inválido: o tratamento ${treatment.id} foi recomendado por avaliação de outro Assistido.`);
      }
      if(previous&&recommendation?.treatmentId&&String(recommendation.treatmentId)!==String(previous.id)){
        throw new Error(`Backup inválido: a avaliação que recomenda o tratamento ${treatment.id} não pertence ao ciclo anterior informado.`);
      }
      if(previous){
        const recommendationId=String(treatment.recommendedByAssessmentId);
        const existingClaim=recommendationClaimByAssessmentId.get(recommendationId);
        if(existingClaim&&existingClaim!==String(treatment.id))throw new Error(`Backup inválido: a avaliação ${recommendationId} recomenda mais de um próximo ciclo de tratamento.`);
        recommendationClaimByAssessmentId.set(recommendationId,String(treatment.id));
      }
    }
    for(const findingId of asArray(treatment.findingIds)){
      requireRef(findingId,findings,'Treatment.findingIds');
      const finding=asArray(state.findings).find((item)=>String(item.id)===String(findingId));
      if(finding?.assistedEntityId&&treatment.assistedEntityId&&finding.assistedEntityId!==treatment.assistedEntityId){
        throw new Error(`Backup inválido: o tratamento ${treatment.id} referencia achado de outro Assistido.`);
      }
    }
  }

  for(const component of asArray(state.treatmentComponents)){
    requireRef(component.treatmentId,treatments,'TreatmentComponent.treatmentId');
    requireRef(component.replacedByComponentId,treatmentComponents,'TreatmentComponent.replacedByComponentId');
    if(component.replacedByComponentId&&String(component.replacedByComponentId)===String(component.id))throw new Error(`Backup inválido: o componente ${component.id} não pode apontar para si próprio como substituto.`);
    const replacement=componentById.get(String(component.replacedByComponentId));
    if(replacement?.treatmentId&&component.treatmentId&&String(replacement.treatmentId)!==String(component.treatmentId))throw new Error(`Backup inválido: o componente ${component.id} aponta para substituto de outro tratamento.`);
  }
  for(const review of asArray(state.treatmentReviews)){
    requireRef(review.treatmentId,treatments,'TreatmentReview.treatmentId');
    requireRef(review.sessionId,sessions,'TreatmentReview.sessionId');
    requireRef(review.assistedEntityId,assisted,'TreatmentReview.assistedEntityId');
    const treatment=treatmentById.get(String(review.treatmentId));
    if(treatment?.assistedEntityId&&review.assistedEntityId&&treatment.assistedEntityId!==review.assistedEntityId)throw new Error(`Backup inválido: a revisão ${review.id} pertence a outro Assistido.`);
  }
  for(const review of asArray(state.componentReviews)){
    requireRef(review.treatmentId,treatments,'ComponentReview.treatmentId');
    requireRef(review.componentId,treatmentComponents,'ComponentReview.componentId');
    requireRef(review.sessionId,sessions,'ComponentReview.sessionId');
    requireRef(review.assistedEntityId,assisted,'ComponentReview.assistedEntityId');
    const treatment=treatmentById.get(String(review.treatmentId));
    const component=componentById.get(String(review.componentId));
    if(treatment?.assistedEntityId&&review.assistedEntityId&&treatment.assistedEntityId!==review.assistedEntityId)throw new Error(`Backup inválido: a revisão de componente ${review.id} pertence a outro Assistido.`);
    if(component?.treatmentId&&review.treatmentId&&String(component.treatmentId)!==String(review.treatmentId))throw new Error(`Backup inválido: a revisão de componente ${review.id} aponta para um componente de outro tratamento.`);
  }

  const sourceClaimByAssessmentId=new Map();
  for(const assessment of asArray(state.assessments)){
    if(assessment.sourceAssessmentId){
      const sourceId=String(assessment.sourceAssessmentId);
      const existingClaim=sourceClaimByAssessmentId.get(sourceId);
      if(existingClaim&&existingClaim!==String(assessment.id))throw new Error(`Backup inválido: a avaliação de origem ${sourceId} possui mais de uma avaliação de continuidade.`);
      sourceClaimByAssessmentId.set(sourceId,String(assessment.id));
    }
    requireRef(assessment.sessionId,sessions,'Assessment.sessionId');
    requireRef(assessment.assistedEntityId,assisted,'Assessment.assistedEntityId');
    requireRef(assessment.treatmentId,treatments,'Assessment.treatmentId');
    requireRef(assessment.sourceAssessmentId,assessments,'Assessment.sourceAssessmentId');
    requireRef(assessment.followUpAssessmentId,assessments,'Assessment.followUpAssessmentId');
    requireRef(assessment.linkedInvestigationId,investigations,'Assessment.linkedInvestigationId');
    if(assessment.sourceAssessmentId===assessment.id||assessment.followUpAssessmentId===assessment.id)throw new Error(`Backup inválido: a avaliação ${assessment.id} não pode apontar para si própria.`);
    const treatment=treatmentById.get(String(assessment.treatmentId));
    if(treatment?.assistedEntityId&&assessment.assistedEntityId&&treatment.assistedEntityId!==assessment.assistedEntityId)throw new Error(`Backup inválido: a avaliação ${assessment.id} pertence a outro Assistido.`);
    for(const [field,label] of [['sourceAssessmentId','avaliação de origem'],['followUpAssessmentId','avaliação de continuidade']]){
      const linked=assessmentById.get(String(assessment[field]));
      if(!linked)continue;
      if(linked.assistedEntityId&&assessment.assistedEntityId&&linked.assistedEntityId!==assessment.assistedEntityId)throw new Error(`Backup inválido: a ${label} de ${assessment.id} pertence a outro Assistido.`);
      if(linked.sessionId&&assessment.sessionId&&linked.sessionId!==assessment.sessionId)throw new Error(`Backup inválido: a ${label} de ${assessment.id} pertence a outra sessão.`);
      if(field==='sourceAssessmentId'&&linked.followUpAssessmentId&&String(linked.followUpAssessmentId)!==String(assessment.id))throw new Error(`Backup inválido: a avaliação de origem de ${assessment.id} aponta para outra continuidade.`);
      if(field==='followUpAssessmentId'&&linked.sourceAssessmentId&&String(linked.sourceAssessmentId)!==String(assessment.id))throw new Error(`Backup inválido: a avaliação de continuidade de ${assessment.id} aponta para outra origem.`);
    }
    if(assessment.selectedProtocolId&&Array.isArray(assessment.protocolSuggestions)){
      if(!assessment.protocolSuggestions.length)throw new Error(`Backup inválido: a avaliação ${assessment.id} possui protocolo selecionado sem sugestões registradas.`);
      const selectedSuggestion=assessment.protocolSuggestions.find((item)=>String(item?.protocolId)===String(assessment.selectedProtocolId));
      if(!selectedSuggestion)throw new Error(`Backup inválido: o protocolo selecionado na avaliação ${assessment.id} não pertence às sugestões registradas.`);
      const selectedProtocolName=String(assessment.selectedProtocolName||'').trim();
      const suggestionProtocolName=String(selectedSuggestion.protocolName||'').trim();
      if(!selectedProtocolName||!suggestionProtocolName||selectedProtocolName!==suggestionProtocolName)throw new Error(`Backup inválido: o nome do protocolo selecionado na avaliação ${assessment.id} não corresponde à sugestão registrada.`);
    }
    const linkedInvestigation=investigationById.get(String(assessment.linkedInvestigationId));
    if(linkedInvestigation){
      if(linkedInvestigation.assistedEntityId&&assessment.assistedEntityId&&linkedInvestigation.assistedEntityId!==assessment.assistedEntityId)throw new Error(`Backup inválido: a investigação vinculada à avaliação ${assessment.id} pertence a outro Assistido.`);
      // currentSessionId is intentionally mutable when an investigation is resumed later. The assessment keeps the historical session where the handoff was made, so storage integrity must validate stable identity/protocol references without requiring the investigation to remain in that original current session.
      if(assessment.selectedProtocolId&&linkedInvestigation.protocolId&&assessment.selectedProtocolId!==linkedInvestigation.protocolId)throw new Error(`Backup inválido: o protocolo selecionado na avaliação ${assessment.id} não corresponde à investigação vinculada.`);
    }
  }

  for(const reiki of asArray(state.reikiApplications)){
    requireRef(reiki.sessionId,sessions,'ReikiApplication.sessionId');
    requireRef(reiki.assistedEntityId,assisted,'ReikiApplication.assistedEntityId');
    requireRef(reiki.treatmentId,treatments,'ReikiApplication.treatmentId');
    const treatment=treatmentById.get(String(reiki.treatmentId));
    if(treatment?.assistedEntityId&&reiki.treatmentId&&reiki.assistedEntityId&&treatment.assistedEntityId!==reiki.assistedEntityId)throw new Error(`Backup inválido: a aplicação de Reiki ${reiki.id} está vinculada a tratamento de outro Assistido.`);
  }

  for(const event of asArray(state.events)){
    requireRef(event.sessionId,sessions,'Event.sessionId');
    requireRef(event.assistedEntityId,assisted,'Event.assistedEntityId');
  }
  return true;
}