import assert from 'node:assert/strict';
import { toolUsageCount } from './tool-usage.js';

const state={
  treatmentComponents:[
    {id:'c1',toolId:'graph-a'},
    {id:'c2',commands:[{graphApplications:[{toolId:'graph-a'},{toolId:'graph-b'}]}]},
    {id:'c3',treatmentItem:{commands:[{graphApplications:[{toolId:'graph-a'},{toolId:'graph-a'}]}]}}
  ],
  preparationRuns:[{protection:{toolIds:['graph-a','other']}}],
  customProtocols:[{toolIds:['graph-b','graph-b']}]
};

assert.equal(toolUsageCount(state,'graph-a'),5,'legacy component, nested graph applications and preparation use must all count');
assert.equal(toolUsageCount(state,'graph-b'),3,'treatment graph and repeated custom-protocol references must count');
assert.equal(toolUsageCount(state,'missing'),0);
assert.equal(toolUsageCount({},'graph-a'),0);
assert.equal(toolUsageCount(state,''),0);

console.log('tool-usage.test.mjs: ok');
