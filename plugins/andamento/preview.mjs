import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { PlanStore } from './store.mjs';
const store=new PlanStore();
const port=Number(process.env.ANDAMENTO_PREVIEW_PORT||5128);
const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  try {
    const url=new URL(req.url,'http://127.0.0.1:'+port);
    if(req.method!=='GET'){res.writeHead(405);return res.end();}
    if(url.pathname==='/api/progress') {
      const threadId=url.searchParams.get('threadId');
      res.setHeader('Content-Type','application/json; charset=utf-8');
      return res.end(JSON.stringify({plan:threadId?await store.get(threadId):null,plans:await store.list(),selectedThreadId:threadId}));
    }
    if(url.pathname!=='/'){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'");
    res.end(await readFile(new URL('./ui/panel.html',import.meta.url)));
  }catch{res.writeHead(500);res.end('Não foi possível carregar o painel.');}
});
server.listen(port,'127.0.0.1',()=>console.log('Prévia local: http://127.0.0.1:'+port));
