import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const hookPath=fileURLToPath(new URL('../hooks/context.mjs',import.meta.url));

function runHook(event,env=process.env){
 return spawnSync(process.execPath,[hookPath],{input:JSON.stringify(event),encoding:'utf8',env});
}

test('hooks adicionam contexto sem bloquear nem reescrever a orientação recebida',()=>{
 const marker='ORIENTACAO-DIRETA-NAO-REESCREVER';
 const output=runHook({hook_event_name:'UserPromptSubmit',session_id:'chat-test',turn_id:'turn-test',prompt:marker});
 assert.equal(output.status,0);
 const result=JSON.parse(output.stdout);
 assert.deepEqual(Object.keys(result),['hookSpecificOutput']);
 assert.deepEqual(Object.keys(result.hookSpecificOutput).sort(),['additionalContext','hookEventName']);
 assert.equal(result.hookSpecificOutput.hookEventName,'UserPromptSubmit');
 assert.equal(JSON.stringify(result).includes(marker),false,'o hook não deve devolver nem reescrever o texto do usuário');
 const context=result.hookSpecificOutput.additionalContext;
 assert.match(context,/orientação, correção ou redirecionamento explícito tem precedência/);
 assert.match(context,/pause imediatamente as ações incompatíveis/);
 assert.match(context,/Nunca bloqueie, rejeite, adie, dificulte ou exija confirmação/);
 assert.match(context,/não alteram nem reescrevem a mensagem recebida/);
 assert.match(context,/plano anterior é histórico, não uma ordem/);
 assert.match(context,/"chat-test"/);
 assert.match(context,/"turn-test"/);
 assert.doesNotMatch(JSON.stringify(result),/"decision"\s*:\s*"block"/);
 assert.doesNotMatch(JSON.stringify(result),/"updatedInput"\s*:/);
});

test('SessionStart mantém o identificador de conversa e a precedência da pessoa',()=>{
 const output=runHook({hook_event_name:'SessionStart',session_id:'chat-session'});
 assert.equal(output.status,0);
 const result=JSON.parse(output.stdout);
 const context=result.hookSpecificOutput.additionalContext;
 assert.match(context,/"chat-session"/);
 assert.match(context,/mensagem mais recente da pessoa/);
 assert.match(context,/continue o trabalho normalmente/);
});

test('gatilho inclui contexto opcional configurado na instalação',()=>{
 const output=runHook({hook_event_name:'SessionStart',session_id:'chat-config'},
  {...process.env,ANDAMENTO_CONTEXT:'Use estimativas em minutos e respostas concisas.'});
 assert.equal(output.status,0);
 const context=JSON.parse(output.stdout).hookSpecificOutput.additionalContext;
 assert.match(context,/Use estimativas em minutos e respostas concisas/);
});

test('evento desconhecido ou sem session_id termina sem bloquear e sem emitir decisão',()=>{
 for(const event of [
  {hook_event_name:'UnknownEvent',session_id:'chat-test'},
  {hook_event_name:'UserPromptSubmit'},
 ]){
  const output=runHook(event);
  assert.equal(output.status,0);
  assert.equal(output.stdout,'');
 }
});

test('configuração limita-se a hooks de contexto e não declara bloqueio',async()=>{
 const config=JSON.parse(await readFile(new URL('../hooks/hooks.json',import.meta.url),'utf8'));
 assert.deepEqual(Object.keys(config.hooks).sort(),['SessionStart','UserPromptSubmit']);
 const commandHooks=Object.values(config.hooks).flatMap(entries=>entries.flatMap(entry=>entry.hooks));
 assert.ok(commandHooks.length>0);
 for(const hook of commandHooks){
  assert.equal(hook.type,'command');
  assert.match(hook.command,/context\.mjs/);
  assert.equal(Object.hasOwn(hook,'decision'),false);
 }
});
