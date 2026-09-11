import {diff,select,PUBLIC_FIELDS,PRIVATE_FIELDS,type SocketGrant} from '../../shared/town-wire';
type Attachment=SocketGrant&{connection:string;lastId:number;window:number;count:number;ackAt:number};
export class TownRealtime{
 private world:any=null;private privateStates=new Map<WebSocket,any>();
 constructor(private ctx:DurableObjectState){}
 grant(ws:WebSocket){return ws.deserializeAttachment() as Attachment}
 send(ws:WebSocket,value:any){try{if(ws.readyState===1)ws.send(JSON.stringify(value))}catch{try{ws.close(1013,'Reconnect for a fresh snapshot')}catch{}}}
 close(ws:WebSocket,code:number,reason:string){this.privateStates.delete(ws);try{ws.close(code,reason)}catch{}}
 revoke(session:string){this.ctx.storage.kv.put('revoked:'+session,true);for(const ws of this.ctx.getWebSockets())if(this.grant(ws)?.session===session)this.close(ws,4401,'Session ended')}
 revokeResident(resident:string,code=4409){for(const ws of this.ctx.getWebSockets())if(this.grant(ws)?.resident===resident)this.close(ws,code,'Reconnect to your current town')}
 authorized(ws:WebSocket){const g=this.grant(ws);return !!g&&g.expires>Date.now()&&!this.ctx.storage.kv.get('revoked:'+g.session)}
 accept(ws:WebSocket,grant:SocketGrant){const existing=this.ctx.getWebSockets().filter(s=>this.grant(s)?.resident===grant.resident);if(existing.length>=4)this.close(existing[0],1013,'Too many connected devices');if(this.ctx.getWebSockets().length>=220)throw new Error('Too many town connections');this.ctx.acceptWebSocket(ws);ws.serializeAttachment({...grant,connection:crypto.randomUUID(),lastId:0,window:Date.now(),count:0,ackAt:Date.now()} satisfies Attachment)}
 validGrant(grant:SocketGrant){return grant.expires>Date.now()&&!this.ctx.storage.kv.get('revoked:'+grant.session)}
 packet(ws:WebSocket,message:string|ArrayBuffer):any|null{
  if(!this.authorized(ws)){this.close(ws,this.grant(ws)?.expires<=Date.now()?4408:4401,'Session needs renewal');return null}
  if(typeof message!=='string'){this.close(ws,1003,'Text messages only');return null}if(new TextEncoder().encode(message).length>32768){this.close(ws,1009,'Message too large');return null}
  let p:any;try{p=JSON.parse(message)}catch{this.close(ws,1007,'Invalid message');return null}
  const g=this.grant(ws),now=Date.now();if(now-g.window>=1000){g.window=now;g.count=0}if(++g.count>24){this.close(ws,1008,'Too many messages');return null}ws.serializeAttachment(g);
  if(p?.type==='ack'||p?.type==='ping'){g.ackAt=now;ws.serializeAttachment(g);if(p.type==='ping')this.send(ws,{type:'pong'});return null}
  if(!p||p.type!=='request'||!Number.isSafeInteger(p.id)||p.id<=g.lastId){this.send(ws,{type:'response',id:p?.id,status:409,value:{error:'Request already received. Refresh before trying again.'}});return null}
  // Persist sequence before applying an action: replay never applies it twice.
  g.lastId=p.id;g.ackAt=now;ws.serializeAttachment(g);return p;
 }
 publish(value:any,skip?:WebSocket){
  if(!value?.resident)return 0;
  const revision=(this.ctx.storage.kv.get<number>('wire-revision')??0)+1;this.ctx.storage.kv.put('wire-revision',revision);
  const next=select(value,PUBLIC_FIELDS),patch=this.world?diff(this.world,next):null;this.world=next;
  if(!patch||patch.length)for(const ws of this.ctx.getWebSockets()){
   if(ws===skip)continue;if(!this.authorized(ws)){this.close(ws,this.grant(ws)?.expires<=Date.now()?4408:4401,'Session needs renewal');continue}
   if(Date.now()-this.grant(ws).ackAt>15000){this.close(ws,1013,'Connection fell behind');continue}
   this.send(ws,{type:'world',town:value.town.id,revision,...(patch?{patch}:{value:next})});
  }
  return revision;
 }
 welcome(ws:WebSocket,value:any){const revision=this.publish(value,ws);const personal=select(value,PRIVATE_FIELDS);this.privateStates.set(ws,personal);this.send(ws,{type:'welcome',town:value.town.id,revision,world:select(value,PUBLIC_FIELDS),personal})}
 personal(value:any,revision:number,skip?:WebSocket){if(!value?.resident)return;for(const ws of this.ctx.getWebSockets()){if(ws===skip||!this.authorized(ws)||this.grant(ws).resident!==value.resident.id)continue;const next=select(value,PRIVATE_FIELDS),old=this.privateStates.get(ws);this.privateStates.set(ws,next);this.send(ws,{type:'personal',town:value.town.id,revision,...(old?{patch:diff(old,next)}:{personal:next})})}}
 response(ws:WebSocket,id:number,status:number,value:any){
  if(!value?.resident){this.send(ws,{type:'response',id,status,value});return}
  const revision=this.publish(value);this.personal(value,revision,ws);const personal=select(value,PRIVATE_FIELDS),old=this.privateStates.get(ws);this.privateStates.set(ws,personal);
  const extras=Object.fromEntries(Object.entries(value).filter(([k])=>![...PUBLIC_FIELDS,...PRIVATE_FIELDS].includes(k as any)));
  this.send(ws,{type:'response',id,status,town:value.town.id,revision,extras,...(old?{patch:diff(old,personal)}:{personal})});
 }
 notify(topic:string,resident?:string,channel?:string,eligible?:Set<string>){for(const ws of this.ctx.getWebSockets()){if(!this.authorized(ws))continue;const g=this.grant(ws);if(resident&&g.resident!==resident||eligible&&!eligible.has(g.resident))continue;this.send(ws,{type:'changed',topic,channel})}}
 room(owner:string,peers:any[],residents:Set<string>){for(const ws of this.ctx.getWebSockets())if(this.authorized(ws)&&residents.has(this.grant(ws).resident))this.send(ws,{type:'room',owner,peers})}
 forget(ws:WebSocket){this.privateStates.delete(ws)}
}
