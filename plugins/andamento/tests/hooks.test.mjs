import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('gatilho preserva IDs reais e orienta acompanhamento sem preferências pessoais',()=>{
 const output=spawnSync(process.execPath,[fileURLToPath(new URL('../hooks/context.mjs',import.meta.url))],{
  input:JSON.stringify({hook_event_name:'UserPromptSubmit',session_id:'chat-test',turn_id:'turn-test'}),encoding:'utf8'
 });
 assert.equal(output.status,0);
 const context=JSON.parse(output.stdout).hookSpecificOutput.additionalContext;
 assert.ok(context.includes('"chat-test"')&&context.includes('"turn-test"'));
 assert.match(context,/não publique checklist ou cartão/);
 assert.match(context,/não presuma aprovações/);
 assert.match(context,/preferências expressas pela pessoa/);
 assert.doesNotMatch(context,/Felipe|aprovou a posição|a menos que Felipe/);
 assert.doesNotMatch(context,/mostre um checklist/);
});

test('gatilho inclui contexto opcional configurado na instalação',()=>{
 const output=spawnSync(process.execPath,[fileURLToPath(new URL('../hooks/context.mjs',import.meta.url))],{
  input:JSON.stringify({hook_event_name:'SessionStart',session_id:'chat-config'}),
  encoding:'utf8',env:{...process.env,ANDAMENTO_CONTEXT:'Use estimativas em minutos e respostas concisas.'}
 });
 assert.equal(output.status,0);
 const context=JSON.parse(output.stdout).hookSpecificOutput.additionalContext;
 assert.match(context,/Use estimativas em minutos e respostas concisas/);
});
