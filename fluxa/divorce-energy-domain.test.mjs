import assert from 'node:assert/strict';
import {
  DIVORCE_ENERGY_AREAS,
  DIVORCE_ENERGY_GENERAL,
  DIVORCE_ENERGY_CUT,
  answeredDivorceAreas,
  validateDivorceEnergyDraft,
  divorceEnergyFindings
} from './divorce-energy-domain.js';

const completeAnswers=Object.fromEntries(DIVORCE_ENERGY_AREAS.map(([id])=>[id,'NO']));
completeAnswers.affective='YES';
completeAnswers.prosperity='YES';

assert.equal(answeredDivorceAreas({affective:'YES'}),1,'Only explicit YES/NO responses should count as assessed.');
assert.throws(
  ()=>validateDivorceEnergyDraft({theme:'Relacionamentos amorosos',answers:{affective:'YES'}}),
  /Responda todas as áreas/,
  'Unanswered areas must never be silently converted to NO.'
);
assert.throws(
  ()=>validateDivorceEnergyDraft({theme:'Outro',other:'   ',answers:completeAnswers}),
  /Descreva o tema/,
  'The custom theme must be described before completion.'
);
assert.equal(validateDivorceEnergyDraft({theme:'Relacionamentos amorosos',answers:completeAnswers}),true);

const findings=divorceEnergyFindings({theme:'Relacionamentos amorosos',answers:completeAnswers});
assert.equal(findings.length,4,'General treatment, general cut and two positive specific areas must be preserved.');
assert.equal(findings[0].sourceQuestionId,'general');
assert.equal(findings[1].sourceQuestionId,'cut');
assert.match(findings[0].suggestedTreatmentCommand,new RegExp(DIVORCE_ENERGY_GENERAL.graph));
assert.match(findings[1].suggestedTreatmentCommand,new RegExp(DIVORCE_ENERGY_CUT.graph));
assert.ok(findings.some((item)=>item.sourceQuestionId==='affective'),'Positive affective area must become a traceable treatment finding.');
assert.ok(findings.some((item)=>item.sourceQuestionId==='prosperity'),'Positive prosperity area must become a traceable treatment finding.');
assert.ok(!findings.some((item)=>item.sourceQuestionId==='health'),'Negative areas must not become specific treatment findings.');

console.log('divorce-energy-domain.test.mjs: ok');
