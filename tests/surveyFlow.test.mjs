import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSurvey, validateSurveyAnswers, validateSurveyFields, changeSurveyAnswer } from '../src/lib/surveyFlow.mjs';
const q = (id, extra = {}) => ({ id, type: 'short_text', label: id, required: true, ...extra });
const section = (id, after = 'next') => ({ id, type: 'section', label: id, after });
const definition = () => [
  section('intro'),
  q('gate', { type: 'multiple_choice', options: ['A', 'B', 'Không phù hợp'], rules: [
    { value: 'A', target: 'a' }, { value: 'B', target: 'b' }, { value: 'Không phù hợp', target: 'screenout', message: 'Cảm ơn bạn.' }
  ] }),
  section('a', 'common'), q('qa'),
  section('b', 'common'), q('qb'),
  section('common'), q('qc')
];
test('legacy flat questions still validate required answers', () => {
  assert.equal(validateSurveyAnswers([q('old')], {old:'yes'}).status, 'complete');
  assert.match(validateSurveyAnswers([q('old')], {}).error, /old/);
});
test('unanswered gate pauses; separate branches skip other required questions', () => {
  const fields = definition();
  assert.equal(evaluateSurvey(fields, {}).status,'pending');
  const result = validateSurveyAnswers(fields, {gate:'B',qb:'B answer',qc:'common',qa:'forged hidden answer',unknown:'injected'});
  assert.equal(result.error,undefined);
  assert.deepEqual(result.visible.map(f=>f.id),['intro','gate','b','qb','common','qc']);
  assert.deepEqual(result.answers,{gate:'B',qb:'B answer',qc:'common'});
  assert.equal(validateSurveyAnswers(fields,{gate:'A',qa:'A answer',qc:'common'}).error,undefined);
});
test('screenout stops immediately and cannot be submitted as a complete response', () => {
  const result=validateSurveyAnswers(definition(),{gate:'Không phù hợp',qa:'forged',qb:'forged',qc:'forged'});
  assert.equal(result.status,'screenout');assert.equal(result.error,'Cảm ơn bạn.');
  assert.deepEqual(result.answers,{gate:'Không phù hợp'});
});
test('editing an earlier answer clears downstream answers and former branches', () => {
  const result=changeSurveyAnswer(definition(),{gate:'A',qa:'old',qc:'old common'},'gate','B');
  assert.deepEqual(result,{gate:'B'});
  assert.match(validateSurveyAnswers(definition(),result).error,/qb/);
});
test('forward question targets include their section and follow section exit', () => {
  const fields=definition();fields[1].rules[0].target='qb';
  assert.deepEqual(evaluateSurvey(fields,{gate:'A'}).visible.map(f=>f.id),['intro','gate','b','qb','common','qc']);
});
test('complete branch skips rest but still validates earlier required answers', () => {
 const fields=[q('name'),q('gate',{type:'dropdown',options:['End'],rules:[{value:'End',target:'complete'}]}),q('skipped')];
 assert.match(validateSurveyAnswers(fields,{gate:'End'}).error,/name/);
 assert.equal(validateSurveyAnswers(fields,{name:'An',gate:'End'}).error,undefined);
});
test('rejects cycles, missing targets and incompatible option edits', () => {
 for (const target of ['gate','intro','deleted']) {
  const fields=definition();fields[1].rules[0].target=target;
  assert.ok(validateSurveyFields(fields));assert.equal(evaluateSurvey(fields,{}).status,'invalid');
 }
 const fields=definition();fields[1].options=['Changed'];assert.ok(validateSurveyFields(fields));
});
test('section exits cannot loop into their own questions or previous sections', () => {
 for(const target of ['qa','intro','a']) {
  const fields=definition();fields[2].after=target;assert.ok(validateSurveyFields(fields));
 }
});
test('zero scale answer counts as answered; invalid choice values are rejected', () => {
 const fields=[q('scale',{type:'linear_scale',min:0,max:3,rules:[{value:'0',target:'screenout'}]})];
 assert.equal(evaluateSurvey(fields,{scale:0}).status,'screenout');
 assert.equal(validateSurveyAnswers(fields,{scale:1}).error,undefined);
 assert.ok(validateSurveyAnswers(fields,{scale:100}).error);
 assert.ok(validateSurveyAnswers(definition(),{gate:'invented',qa:'x',qc:'x'}).error);
});
test('checkbox requiredness validates only the visited path', () => {
 const f=q('check',{type:'checkbox',options:['X','Y']});
 assert.ok(validateSurveyAnswers([f],{check:[]}).error);
 assert.ok(validateSurveyAnswers([f],{check:['invalid']}).error);
 assert.equal(validateSurveyAnswers([f],{check:['X']}).error,undefined);
});

test('ordinary answer edits and selecting the same branch preserve later answers', () => {
 const answers={gate:'A',qa:'old',qc:'keep'};
 assert.deepEqual(changeSurveyAnswer(definition(),answers,'qa','new'),{gate:'A',qa:'new',qc:'keep'});
 assert.deepEqual(changeSurveyAnswer(definition(),answers,'gate','A'),answers);
});
