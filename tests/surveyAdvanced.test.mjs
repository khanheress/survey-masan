import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSurvey,validateSurveyAnswers,validateSurveyFields,changeSurveyAnswer} from '../src/lib/surveyFlow.mjs';
import {sectionVisible,pipeText,formatAnswer,FILE_LIMIT} from '../src/lib/surveyAdvanced.mjs';
import {duplicateItems,ensureSections,referencesAny,splitSections} from '../src/lib/surveyEditor.mjs';
const question=(id,type,extra={})=>({id,type,label:id,...extra});
const group=(id,visibility=[],after='next')=>({id,type:'section',label:id,visibility,after});
const condition=(questionId,operator,value='')=>({questionId,operator,value});
test('section visibility uses OR groups and AND conditions; absent values do not satisfy negative comparisons',()=>{
 const groups=[[condition('brand','includes','A'),condition('age','gte','18')],[condition('override','eq','Yes')]];
 assert.equal(sectionVisible(groups,{brand:['A'],age:20}),true);
 assert.equal(sectionVisible(groups,{brand:['A'],age:12}),false);
 assert.equal(sectionVisible(groups,{brand:['B'],override:'Yes'}),true);
 assert.equal(sectionVisible([[condition('missing','neq','No')]],{}),false);
});
test('hidden sections ignore exits and branch rules, and hidden answers are not stored',()=>{
 const fields=[group('intro'),question('pick','checkbox',{options:['A','B']}),group('hidden',[[condition('pick','includes','A')]],'complete'),question('trap','multiple_choice',{options:['Stop'],required:true,rules:[{value:'Stop',target:'screenout'}]}),group('common'),question('finish','short_text',{required:true})];
 const result=validateSurveyAnswers(fields,{pick:['B'],trap:'Stop',finish:'ok'});
 assert.equal(result.error,undefined);assert.equal(result.visible.some(f=>f.id==='hidden'),false);assert.deepEqual(result.answers,{pick:['B'],finish:'ok'});
});
test('direct jump to a question still respects containing section visibility',()=>{
 const fields=[group('intro'),question('gate','dropdown',{options:['Go'],rules:[{value:'Go',target:'hiddenQ'}]}),group('hidden',[[condition('gate','eq','Other')]]),question('hiddenQ','short_text',{required:true}),group('last'),question('lastQ','short_text')];
 assert.deepEqual(evaluateSurvey(fields,{gate:'Go'}).visible.map(f=>f.id),['intro','gate','last','lastQ']);
});
test('changing condition sources clears downstream answers and revealing the section starts fresh',()=>{
 const fields=[group('intro'),question('pick','checkbox',{options:['A','B']}),group('a',[[condition('pick','includes','A')]]),question('detail','short_text')];
 assert.deepEqual(changeSurveyAnswer(fields,{pick:['A'],detail:'old'},'pick',['B']),{pick:['B']});
});
test('matrix validation checks rows, legal columns, required rows and values',()=>{
 const single=question('grid','matrix_single',{rows:['R1','R2'],columns:['Yes','No'],required:true});
 assert.equal(validateSurveyAnswers([single],{grid:{R1:'Yes',R2:'No'}}).error,undefined);
 assert.ok(validateSurveyAnswers([single],{grid:{R1:'Yes'}}).error);
 assert.ok(validateSurveyAnswers([single],{grid:{R1:'Fake',R2:'No'}}).error);
 const multi={...single,type:'matrix_multi'};
 assert.equal(validateSurveyAnswers([multi],{grid:{R1:['Yes','No'],R2:['No']}}).error,undefined);
 assert.ok(validateSurveyAnswers([multi],{grid:{R1:['Yes','Yes'],R2:['No']}}).error);
});
test('allocation requires nonnegative integer entries with the configured total',()=>{
 const fields=[question('times','allocation',{options:['A','B'],total:10,required:true})];
 assert.equal(validateSurveyAnswers(fields,{times:{A:0,B:10}}).error,undefined);
 for(const times of [{A:2,B:3},{A:-1,B:11},{A:1.5,B:8.5},{C:10}])assert.ok(validateSurveyAnswers(fields,{times}).error);
});
test('follow-up detail only asks selected options and ignores details from former choices',()=>{
 const fields=[question('brands','checkbox',{options:['A','B']}),question('why','detail_followup',{sourceId:'brands',required:true})];
 assert.equal(validateSurveyAnswers(fields,{}).error,undefined);
 assert.ok(validateSurveyAnswers(fields,{brands:['A'],why:{}}).error);
 const result=validateSurveyAnswers(fields,{brands:['A'],why:{A:'tasty',B:'stale'}});
 assert.deepEqual(result.answers,{brands:['A'],why:{A:'tasty'}});
});
test('skipping an empty detail question still honors the section exit',()=>{
 const fields=[group('intro'),question('brands','checkbox',{options:['A']}),group('detail',[],'complete'),question('why','detail_followup',{sourceId:'brands',required:true}),group('skip'),question('trap','short_text',{required:true})];
 assert.equal(validateSurveyAnswers(fields,{}).error,undefined);assert.equal(evaluateSurvey(fields,{}).visible.some(f=>f.id==='trap'),false);
});
test('piped content formats arrays and structured answers as text and validates references',()=>{
 assert.equal(pipeText('Brands: {{q:brands}}',{brands:['A','B']}),'Brands: A, B');
 assert.equal(pipeText('{{q:a}}',{a:'<script>alert(1)</script>'}),'<script>alert(1)</script>');
 assert.equal(formatAnswer({R1:['A','B']}),'R1: A, B');
 assert.ok(validateSurveyFields([question('a','short_text',{label:'{{q:later}}'}),question('later','short_text')]));
});
test('attachments verify size, encoding and file signature, and format without dumping bytes',()=>{
 const content=Buffer.from('%PDF-1.4\nTest document');const file={kind:'file',name:'test.pdf',mime:'application/pdf',size:content.length,data:content.toString('base64')};
 const fields=[question('upload','file',{required:true})];
 assert.equal(validateSurveyAnswers(fields,{upload:file}).error,undefined);assert.equal(formatAnswer(file),'test.pdf');
 for(const changed of [{size:FILE_LIMIT+1},{data:'<script>'},{mime:'text/html'},{size:1},{kind:'uploading'}])assert.ok(validateSurveyAnswers(fields,{upload:{...file,...changed}}).error);
 const wrong=Buffer.from('<html>evil</html>');assert.ok(validateSurveyAnswers(fields,{upload:{...file,size:wrong.length,data:wrong.toString('base64')}}).error);
});
test('copying a section remaps internal rule and pipe references without mutating original',()=>{
 const original=[group('a'),question('source','multiple_choice',{options:['Yes'],rules:[{value:'Yes',target:'detail'}]}),question('detail','short_text',{label:'Why {{q:source}}?'})];
 const copied=duplicateItems(original);assert.notEqual(copied[0].id,'a');assert.equal(copied[1].rules[0].target,copied[2].id);assert.equal(copied[2].label,`Why {{q:${copied[1].id}}}?`);assert.equal(original[1].rules[0].target,'detail');assert.equal(validateSurveyFields([...original,...copied]),null);
 assert.equal(referencesAny(original,new Set(['source'])),true);
});
test('legacy flat surveys gain a section without changing question identities',()=>{
 const flat=[question('q','short_text')];const converted=ensureSections(flat);assert.equal(splitSections(converted)[0].questions[0].id,'q');assert.equal(ensureSections(converted),converted);
});
