import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { PlanStore, STATES } from './store.mjs';

const store=new PlanStore();
const server=new McpServer({name:'andamento',version:'0.1.7'});
const UI='ui://andamento/painel.html';
const CONVERSATION='ui://andamento/conversa.html';
const annotations={readOnlyHint:true,destructiveHint:false,openWorldHint:false};
const result=data=>({content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data});
const handle=fn=>async args=>{try{return result(await fn(args));}catch(error){return {isError:true,content:[{type:'text',text:error.message}]};}};
const panelResource=(uri,bound=false)=>async()=>({contents:[{uri,mimeType:'text/html;profile=mcp-app',text:(await readFile(new URL('./ui/panel.html',import.meta.url),'utf8')).replace('<body>',bound?'<body data-bound-panel="true">':'<body>'),_meta:{ui:{prefersBorder:false,csp:{connectDomains:[],resourceDomains:[]}},'openai/ui':{availableDisplayModes:['fullscreen']}}}]});
server.registerResource('painel',UI,{mimeType:'text/html;profile=mcp-app'},panelResource(UI));
server.registerResource('conversa',CONVERSATION,{mimeType:'text/html;profile=mcp-app'},panelResource(CONVERSATION,true));
server.registerResource('painel-legado','ui://andamento/flutuante.html',{mimeType:'text/html;profile=mcp-app'},panelResource('ui://andamento/flutuante.html',true));
const progress=async({threadId})=>({plan:threadId?await store.get(threadId):null,plans:await store.list(),selectedThreadId:threadId||null});
server.registerTool('follow_progress',{
  title:'Acompanhar esta conversa',
  description:'Abre diretamente o painel de acompanhamento vinculado a esta conversa, sem seletor. Preserve a posição lateral oferecida pelo Codex; não solicitar PiP ou janela externa. Use uma vez ao iniciar acompanhamento ou quando Felipe pedir reabertura, não em cada etapa. Requer threadId real.',
  inputSchema:{threadId:z.string().min(1).max(240)},annotations,
  _meta:{ui:{resourceUri:CONVERSATION}}
},handle(async({threadId})=>({plan:await store.get(threadId),plans:[],selectedThreadId:threadId})));
server.registerTool('open_panel',{
  title:'Andamento',
  description:'Interface de acompanhamento aberta pelo usuário na barra lateral global ou no painel da conversa. Não é um cartão de resposta do agente.',
  inputSchema:{threadId:z.string().min(1).max(240).optional()},
  annotations,
  _meta:{ui:{resourceUri:UI,visibility:['app']},'openai/ui':{entrypoints:[{type:'global'},{type:'thread'}]}}
},handle(progress));
server.registerTool('view_progress',{
  title:'Conferir painel Andamento',
  description:'Consulta silenciosamente o checklist da conversa, sem inserir cartão no chat. A interface é aberta pelo usuário na entrada Andamento da barra lateral ou do painel da conversa.',
  inputSchema:{threadId:z.string().min(1).max(240).optional()},
  annotations
},handle(progress));
server.registerTool('get_progress',{
  title:'Consultar andamento',description:'Lê o plano de uma conversa e a lista de planos locais para o painel.',
  inputSchema:{threadId:z.string().min(1).max(240).optional()},annotations,
  _meta:{ui:{visibility:['app','model']}}
},handle(async({threadId})=>({plan:threadId?await store.get(threadId):null,plans:await store.list(),selectedThreadId:threadId||null})));
server.registerTool('start_plan',{
  title:'Criar etapas do pedido',description:'Antes de executar um pedido com várias etapas, cria um checklist pendente na conversa atual. Inclua stepEstimatesMinutes, um tempo ativo estimado em minutos por etapa. Não executa tarefas nem marca trabalho como feito. Repetir o mesmo requestId preserva o progresso. Pedidos novos preservam o plano anterior no histórico.',
  inputSchema:{threadId:z.string().min(1).max(240),requestId:z.string().min(1).max(240),title:z.string().min(1).max(180),steps:z.array(z.string().min(1).max(240)).min(1).max(24),stepEstimatesMinutes:z.array(z.number().int().min(1).max(1440)).min(1).max(24).optional()},
  annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false}
},handle(args=>store.start(args)));
server.registerTool('update_step',{
  title:'Atualizar etapa',description:'Atualiza somente uma etapa do pedido atual. Use in_progress antes de executar e envie progressPercent (0–99) nos marcos para estimar a fração da etapa concluída; 100% é reservado à conclusão verificada. Etapas completed e skipped viram 100%, pending e blocked viram 0%. Use blocked com motivo real e skipped quando não aplicável. Não marcar concluído só porque uma ferramenta foi chamada. Note é obrigatória para conclusão, bloqueio ou dispensa.',
  inputSchema:{threadId:z.string().min(1).max(240),requestId:z.string().min(1).max(240),stepId:z.string(),status:z.enum(STATES),note:z.string().max(4000).optional(),expectedRevision:z.number().int().positive().optional(),progressPercent:z.number().int().min(0).max(99).optional()},
  annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false}
},handle(args=>store.update(args)));
await server.connect(new StdioServerTransport());
