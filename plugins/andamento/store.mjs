import { mkdir, readFile, writeFile, rename, readdir, rm } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const STATES = ['pending','in_progress','completed','blocked','skipped'];
export const defaultDirectory = process.env.ANDAMENTO_DATA_DIR || (process.env.PLUGIN_DATA ? join(process.env.PLUGIN_DATA,'plans') : join(homedir(),'.local','share','larry-andamento','plans'));
const key = id => createHash('sha256').update(id).digest('hex');
const text = (value, max=2000) => {
  if(typeof value !== 'string' || !value.trim() || value.length > max) throw Error('Texto vazio ou longo demais.');
  return value.trim();
};
export class PlanStore {
  constructor(directory=defaultDirectory) { this.directory=directory; }
  file(threadId) { return join(this.directory,key(text(threadId,240))+'.json'); }
  async get(threadId) {
    try { return JSON.parse(await readFile(this.file(threadId),'utf8')); }
    catch(error) { if(error.code === 'ENOENT') return null; throw error; }
  }
  async list() {
    await mkdir(this.directory,{recursive:true});
    const names=(await readdir(this.directory)).filter(name=>/^[a-f0-9]{64}\.json$/.test(name));
    const plans=await Promise.all(names.map(name=>readFile(join(this.directory,name),'utf8').then(JSON.parse)));
    return plans.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,40).map(({threadId,title,updatedAt,revision,steps})=>({threadId,title,updatedAt,revision,total:steps.length,completed:steps.filter(s=>s.status==='completed').length}));
  }
  async transaction(threadId, mutate) {
    await mkdir(this.directory,{recursive:true});
    const file=this.file(threadId), lock=file+'.lock'; let acquired=false;
    for(let attempt=0;attempt<80;attempt++) {
      try { await mkdir(lock); acquired=true; break; }
      catch(error) { if(error.code !== 'EEXIST') throw error; await new Promise(r=>setTimeout(r,25)); }
    }
    if(!acquired) throw Error('Plano ocupado. Tente novamente.');
    try {
      const current=await this.get(threadId);
      const result=mutate(current);
      const temp=file+'.'+randomUUID()+'.tmp';
      await writeFile(temp,JSON.stringify(result,null,2),'utf8');
      await rename(temp,file);
      return result;
    } finally { await rm(lock,{recursive:true}); }
  }
  async start({threadId,requestId,title,steps,stepEstimatesMinutes}) {
    threadId=text(threadId,240); requestId=text(requestId,240); title=text(title,180);
    if(!Array.isArray(steps)||steps.length<1||steps.length>24) throw Error('Use de 1 a 24 etapas.');
    const labels=steps.map(s=>text(s,240));
    if(new Set(labels).size !== labels.length) throw Error('Etapas repetidas.');
    if(stepEstimatesMinutes!==undefined&&(!Array.isArray(stepEstimatesMinutes)||stepEstimatesMinutes.length!==labels.length)) throw Error('Informe uma estimativa em minutos para cada etapa.');
    const durations=stepEstimatesMinutes?.map(minutes=>{
      if(!Number.isInteger(minutes)||minutes<1||minutes>1440) throw Error('Cada estimativa deve ser um número inteiro entre 1 e 1440 minutos.');
      return minutes;
    });
    return this.transaction(threadId,current=>{
      if(current?.requestId===requestId) return current;
      const now=new Date().toISOString();
      const previous=current ? [...(current.history||[]),{requestId:current.requestId,title:current.title,steps:current.steps,updatedAt:current.updatedAt,events:current.events}] : [];
      return {threadId,requestId,title,revision:(current?.revision||0)+1,createdAt:now,updatedAt:now,runState:'active',steps:labels.map((label,i)=>({id:'step-'+(i+1),label,status:'pending',note:'',progressPercent:0,...(durations?{estimatedMinutes:durations[i]}:{}),updatedAt:now})),events:[{at:now,type:'started'}],history:previous};
    });
  }
  async update({threadId,requestId,stepId,status,note='',expectedRevision,progressPercent}) {
    if(!STATES.includes(status)) throw Error('Estado inválido.');
    if(typeof note !== 'string'||note.length>4000) throw Error('Observação inválida.');
    if(['completed','blocked','skipped'].includes(status)&&!note.trim()) throw Error('Informe o resultado ou motivo da etapa.');
    if(progressPercent!==undefined&&(!Number.isInteger(progressPercent)||progressPercent<0||progressPercent>99)) throw Error('O progresso de uma etapa em execução deve ser um inteiro entre 0 e 99; 100% é reservado para a conclusão verificada.');
    if(progressPercent!==undefined&&status!=='in_progress') throw Error('Informe progresso estimado somente para uma etapa em execução.');
    return this.transaction(threadId,current=>{
      if(!current) throw Error('Plano não encontrado.');
      if(current.requestId!==requestId) throw Error('Este pedido já não é o plano atual.');
      if(expectedRevision!==undefined && current.revision!==expectedRevision) throw Error('O plano mudou. Releia antes de atualizar.');
      const step=current.steps.find(s=>s.id===stepId);
      if(!step) throw Error('Etapa não encontrada.');
      const now=new Date().toISOString();
      step.status=status; step.note=note.trim();
      if(status==='completed'||status==='skipped') step.progressPercent=100;
      else if(status==='in_progress') step.progressPercent=progressPercent??step.progressPercent??0;
      else step.progressPercent=0;
      step.updatedAt=now;
      current.revision++; current.updatedAt=now;
      current.runState=current.steps.every(s=>['completed','skipped'].includes(s.status))?'finished':'active';
      current.events.push({at:now,type:'step_updated',stepId,status,note:note.trim(),...(status==='in_progress'?{progressPercent:step.progressPercent}:{})});
      return current;
    });
  }
}
