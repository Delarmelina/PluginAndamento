import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const waitFor=async predicate=>{for(let i=0;i<60;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw Error('Interface não atualizou.');};

async function panel(t,{bound=false,legacy=false,input='globals',displayMode='fullscreen',hasModeApi=false,theme='dark',hostVariables={}}={}){
 let html=await readFile(new URL('../ui/panel.html',import.meta.url),'utf8');
 if(bound)html=html.replace('<body>',legacy?'<body data-auto-floating="true">':'<body data-bound-panel="true">');
 let title='<img src=x onerror=alert(1)>',status='pending',revision=1,modeCalls=0;
 const calls=[],intervals=[];let sendHostMessage=()=>{};
 const makePlan=id=>({threadId:id,requestId:title,title:id==='current-chat'?title:'Outro chat',revision,updatedAt:new Date().toISOString(),runState:'active',steps:[{id:'step-1',label:'Conferir resultado',status:id==='current-chat'?status:'pending',note:'',updatedAt:new Date().toISOString()}],history:[]});
 const dom=new JSDOM(html,{url:'https://andamento.local/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(window){
  window.setInterval=(fn,ms)=>{intervals.push(ms);return 1;};
  const send=(method,params)=>setTimeout(()=>window.dispatchEvent(new window.MessageEvent('message',{source:host,data:{jsonrpc:'2.0',method,params}})),0);
  sendHostMessage=send;
  const data=id=>({plan:id?makePlan(id):null,selectedThreadId:id,plans:['current-chat','other-chat'].map(threadId=>({threadId,title:makePlan(threadId).title}))});
  const host={postMessage(message){
   if(message.method==='ui/notifications/initialized'&&bound){
    if(input==='notification')send('ui/notifications/tool-input',{arguments:{threadId:'current-chat'}});
    if(input==='result')send('ui/notifications/tool-result',{structuredContent:data('current-chat')});
   }
   if(message.id===undefined)return;
   let result={};
   if(message.method==='ui/initialize')result={hostContext:{theme,displayMode,styles:{variables:hostVariables}}};
   if(message.method==='tools/call'){calls.push(message.params.arguments.threadId);result={structuredContent:data(message.params.arguments.threadId)};}
   setTimeout(()=>window.dispatchEvent(new window.MessageEvent('message',{source:host,data:{jsonrpc:'2.0',id:message.id,result}})),0);
  }};
  Object.defineProperty(window,'parent',{value:host});
  window.open=()=>{throw Error('Não abrir janela externa');};
  window.openai={displayMode,widgetState:{threadId:bound?'wrong-chat':'current-chat'},setWidgetState(){}};
  if(input==='globals')window.openai.toolInput={threadId:'current-chat'};
  if(hasModeApi)window.openai.requestDisplayMode=()=>{modeCalls++;throw Error('Não solicitar mudança de modo');};
 }});
 t.after(()=>dom.window.close());
 return {dom,calls,intervals,get modeCalls(){return modeCalls;},notify:sendHostMessage,update(nextTitle,nextStatus){title=nextTitle;status=nextStatus;revision++;dom.window.document.getElementById('refresh').click();}};
}

test('painel manual mantém seletor, acessibilidade e texto seguro',async t=>{
 const ui=await panel(t);const doc=ui.dom.window.document;
 await waitFor(()=>doc.getElementById('count').textContent==='0 de 1 concluídas');
 assert.equal(doc.querySelectorAll('img').length,0);
 assert.equal(doc.getElementById('title').textContent,'<img src=x onerror=alert(1)>');
 assert.equal(doc.getElementById('chooser').hidden,false);
 ui.update('Pedido revisado','completed');
 await waitFor(()=>doc.getElementById('count').textContent==='1 de 1 concluídas');
 assert.equal(doc.getElementById('progress').getAttribute('aria-valuenow'),'100');
 doc.getElementById('refresh').focus();assert.equal(doc.activeElement.id,'refresh');
 const select=doc.getElementById('plans');select.value='other-chat';select.dispatchEvent(new ui.dom.window.Event('change'));
 await waitFor(()=>doc.getElementById('title').textContent==='Outro chat');
 assert.ok(ui.intervals.includes(5000));
});

for(const input of ['globals','notification','result'])for(const hasModeApi of [false,true])test('lateral vinculada renderiza sem exigir PiP: '+input+', API='+hasModeApi,async t=>{
 const ui=await panel(t,{bound:true,input,hasModeApi});const doc=ui.dom.window.document;
 await waitFor(()=>!doc.getElementById('plan').hidden);
 assert.equal(doc.getElementById('error').hidden,true);
 assert.equal(doc.getElementById('chooser').hidden,true);
 assert.equal(doc.getElementById('floating'),null);
 assert.equal(ui.modeCalls,0);
 assert.ok(ui.calls.every(id=>id==='current-chat'));
 assert.ok(ui.intervals.includes(2000));
 ui.update('Próximo pedido neste chat','in_progress');
 await waitFor(()=>doc.getElementById('title').textContent==='Próximo pedido neste chat');
 assert.equal(doc.querySelector('.step').getAttribute('aria-current'),'step');
});

test('recurso legado também renderiza sem bloqueio de apresentação',async t=>{
 const ui=await panel(t,{bound:true,legacy:true,hasModeApi:true});
 await waitFor(()=>!ui.dom.window.document.getElementById('plan').hidden);
 assert.equal(ui.modeCalls,0);
});

test('modo não informado não impede leitura das etapas',async t=>{
 const ui=await panel(t,{bound:true,displayMode:null});
 await waitFor(()=>!ui.dom.window.document.getElementById('plan').hidden);
 assert.equal(ui.dom.window.document.getElementById('error').hidden,true);
});

test('tema claro do host aplica paleta legível e color-scheme de controles',async t=>{
 const ui=await panel(t,{theme:'light'});const root=ui.dom.window.document.documentElement;
 await waitFor(()=>root.dataset.theme==='light');
 assert.match(root.outerHTML,/color-scheme:light/);
 assert.match(root.outerHTML,/--fg:#26262c/);
 assert.match(root.outerHTML,/--muted:#4f515a/);
});

test('variáveis CSS oficiais do host são aplicadas com validação de propriedades',async t=>{
 const ui=await panel(t,{hostVariables:{'--host-surface':'rgb(250, 250, 250)','bad name':'red','--unsafe':12}});
 const root=ui.dom.window.document.documentElement;
 await waitFor(()=>root.style.getPropertyValue('--host-surface')==='rgb(250, 250, 250)');
 assert.equal(root.style.getPropertyValue('bad name'),'');
 assert.equal(root.style.getPropertyValue('--unsafe'),'');
});

test('mudança de tema do host atualiza a lateral sem recarregar',async t=>{
 const ui=await panel(t,{theme:'dark'});const root=ui.dom.window.document.documentElement;
 await waitFor(()=>root.dataset.theme==='dark');
 ui.notify('ui/notifications/host-context-changed',{hostContext:{theme:'light',styles:{variables:{'--host-fg':'#26262c'}}}});
 await waitFor(()=>root.dataset.theme==='light'&&root.style.getPropertyValue('--host-fg')==='#26262c');
 assert.match(root.outerHTML,/--fg:#26262c/);
});

test('select respeita alvo mínimo de 44px no breakpoint mobile',async t=>{
 const ui=await panel(t);const sheets=Array.from(ui.dom.window.document.styleSheets);
 const rules=sheets.flatMap(sheet=>Array.from(sheet.cssRules));
 const mobile=rules.find(rule=>rule.cssRules&&rule.cssText.includes('max-width:380px'));
 assert.ok(mobile,'breakpoint mobile deve estar declarado');
 const controls=Array.from(mobile.cssRules).find(rule=>rule.selectorText==='button,select');
 assert.ok(controls,'select deve compartilhar o alvo mobile dos botões');
 assert.equal(controls.style.getPropertyValue('min-height'),'44px');
});

test('abertura manual sem vínculo não assume o chat mais recente',async t=>{
 const html=await readFile(new URL('../ui/panel.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'http://127.0.0.1:5128',runScripts:'dangerously',beforeParse(window){window.fetch=async()=>({ok:true,json:async()=>({plan:null,plans:[{threadId:'outro-chat',title:'Outro pedido'}]})});}});
 t.after(()=>dom.window.close());
 await waitFor(()=>dom.window.document.getElementById('chooser').hidden===false);
 assert.equal(dom.window.document.getElementById('plan').hidden,true);
 assert.equal(dom.window.document.getElementById('plans').value,'');
});
