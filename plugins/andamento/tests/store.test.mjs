import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PlanStore } from '../store.mjs';
async function fixture(t){const dir=await mkdtemp(join(tmpdir(),'andamento-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));return new PlanStore(dir);}
const input=(threadId,requestId='r1')=>({threadId,requestId,title:'Teste '+threadId,steps:['Conferir dados','Executar','Validar']});
test('isola conversas e preserva histórico incremental',async t=>{
 const s=await fixture(t);await s.start(input('a'));await s.start(input('b'));
 await s.update({threadId:'a',requestId:'r1',stepId:'step-1',status:'completed',note:'Dados conferidos'});
 assert.equal((await s.get('b')).steps[0].status,'pending');
 await s.start(input('a'));assert.equal((await s.get('a')).steps[0].status,'completed');
 await s.start(input('a','r2'));assert.equal((await s.get('a')).history[0].steps[0].status,'completed');
 await assert.rejects(s.update({threadId:'a',requestId:'r1',stepId:'step-1',status:'in_progress'}),/atual/);
});
test('exige evidência e motivo, rejeita atualização obsoleta',async t=>{
 const s=await fixture(t);const p=await s.start(input('../../a'));
 await assert.rejects(s.update({threadId:'../../a',requestId:'r1',stepId:'step-1',status:'completed'}),/resultado/);
 await assert.rejects(s.update({threadId:'../../a',requestId:'r1',stepId:'step-1',status:'blocked'}),/resultado/);
 await s.update({threadId:'../../a',requestId:'r1',stepId:'step-1',status:'blocked',note:'Sem acesso à fonte',expectedRevision:p.revision});
 await assert.rejects(s.update({threadId:'../../a',requestId:'r1',stepId:'step-1',status:'in_progress',expectedRevision:p.revision}),/mudou/);
 assert.equal((await s.get('../../a')).runState,'active');
});
test('atualizações concorrentes preservam todas as etapas e eventos',async t=>{
 const s=await fixture(t);await s.start(input('c'));
 await Promise.all([1,2,3].map(i=>s.update({threadId:'c',requestId:'r1',stepId:'step-'+i,status:'completed',note:'Verificado '+i})));
 const p=await s.get('c');assert.equal(p.runState,'finished');assert.equal(p.events.length,4);assert.equal(p.revision,4);
});
