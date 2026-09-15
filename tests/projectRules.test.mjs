import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyProjectRules,validateProjectRules,checkEligibility,vietnamYear} from '../src/lib/projectRules.mjs';
const now=new Date('2026-09-15T00:00:00Z'),profile={respondent_gender:'Nam',respondent_birth_year:2001,respondent_inviter:'Khánh'};
test('optional rules default open; invalid quotas and overlapping age bands rejected',()=>{
 const r=emptyProjectRules();assert.equal(validateProjectRules(r),null);assert.equal(checkEligibility(r,profile,{},[],{},now).eligible,true);
 r.gender.enabled=true;r.gender.quotas.Nam=-1;assert.ok(validateProjectRules(r));r.gender.quotas.Nam=0;assert.equal(checkEligibility(r,profile,{},[],{},now).eligible,false);
 r.gender.enabled=false;r.age={enabled:true,bands:[{min:18,max:25,quota:null},{min:25,max:30,quota:null}]};assert.ok(validateProjectRules(r));r.age.bands[1].min=26;assert.equal(validateProjectRules(r),null);
 assert.equal(checkEligibility(r,profile,{},[],{},now).eligible,true);assert.equal(checkEligibility(r,{...profile,respondent_birth_year:1990},{},[],{},now).eligible,false);
});
test('BUMO waits for answer, supports multiple accepted products and checks each quota',()=>{
 const r=emptyProjectRules();r.bumo={enabled:true,products:[{name:'A',quota:1},{name:'B',quota:null}]};const fields=[{id:'q',purpose:'bumo'}];
 assert.equal(checkEligibility(r,profile,{},fields,{},now).eligible,null);
 assert.equal(checkEligibility(r,profile,{q:'C'},fields,{},now).eligible,false);
 assert.deepEqual(checkEligibility(r,profile,{q:['A','B']},fields,{},now).bumo,['A','B']);
 assert.equal(checkEligibility(r,profile,{q:['A','B']},fields,{bumo:{A:1}},now).eligible,false);
 assert.equal(checkEligibility(r,profile,{q:'B'},fields,{bumo:{A:1}},now).eligible,true);
});
test('age uses Vietnamese year at the New Year boundary',()=>{assert.equal(vietnamYear(new Date('2026-12-31T17:00:00Z')),2027);assert.equal(vietnamYear(new Date('2026-12-31T16:59:59Z')),2026);});
