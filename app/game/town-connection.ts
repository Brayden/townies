'use client';
import {applyPatch,select,PUBLIC_FIELDS,PRIVATE_FIELDS} from '../../shared/town-wire';
type Listener=(value:any)=>void;
class TownConnection{
 private connecting=false;private generation=0;private socket:WebSocket|null=null;private active=false;private welcomed=false;private attempt=0;private nextId=0;
 private world:any={};private personal:any={};private roomPeers:{owner:string;peers:any[]}|null=null;private worldRevision=0;private personalRevision=0;
 private pending=new Map<number,{resolve:(r:Response)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
 private listeners=new Map<string,Set<Listener>>();private retry:ReturnType<typeof setTimeout>|null=null;private pulse:ReturnType<typeof setInterval>|null=null;private delivery:ReturnType<typeof setTimeout>|null=null;private refresh:ReturnType<typeof setTimeout>|null=null;private lastAck=0;private lastReceived=0;
 on(topic:string,fn:Listener){let set=this.listeners.get(topic);if(!set)this.listeners.set(topic,set=new Set());set.add(fn);return()=>{set!.delete(fn)}}
 private emit(topic:string,value?:any){for(const listener of this.listeners.get(topic)??[])listener(value)}
 connected(){return this.welcomed&&this.socket?.readyState===WebSocket.OPEN}
 snapshot(){const state={...this.world,...structuredClone(this.personal)};if(state.room&&this.roomPeers?.owner===state.room.owner)state.room.peers=this.roomPeers!.peers;return state}
 private changed(){if(this.delivery)return;this.delivery=setTimeout(()=>{this.delivery=null;if(this.personal.resident)this.emit('state',this.snapshot())},50)}
 seed(value:any){if(!value?.resident)return value;const previous=this.personal.resident;if(previous&&(value.resident.townJoinedAt??0)<(previous.townJoinedAt??0))return this.snapshot();if(this.world.town?.id!==value.town.id){this.world={};this.personal={};this.worldRevision=0;this.personalRevision=0;this.roomPeers=null}const version=value._townRevision??0;if(version>=this.worldRevision){this.world=select(value,PUBLIC_FIELDS);this.worldRevision=version}if(version>=this.personalRevision){this.personal=select(value,PRIVATE_FIELDS);this.personalRevision=version}return {...value,...this.snapshot()}}
 start(){if(this.active)return;this.active=true;document.addEventListener('visibilitychange',this.visibility);window.addEventListener('online',this.online);void this.connect();this.pulse=setInterval(()=>{if(!this.connected())return;if(Date.now()-this.lastReceived>15000){this.socket?.close(4000,'Connection timeout');return}this.socket?.send(JSON.stringify({type:'ping'}))},5000)}
 stop(){this.generation++;this.connecting=false;this.active=false;this.welcomed=false;if(this.retry)clearTimeout(this.retry);if(this.pulse)clearInterval(this.pulse);if(this.delivery)clearTimeout(this.delivery);if(this.refresh)clearTimeout(this.refresh);this.retry=this.delivery=this.refresh=null;document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('online',this.online);const socket=this.socket;this.socket=null;socket?.close(1000,'Leaving town');this.failPending();this.world={};this.personal={};this.worldRevision=this.personalRevision=0;this.roomPeers=null}
 private visibility=()=>{if(document.hidden){this.socket?.close(1000,'App in background')}else{void this.connect()}};
 private online=()=>{void this.connect()};
 private failPending(){for(const item of this.pending.values()){clearTimeout(item.timer);item.reject(new Error('Connection interrupted. Your town will refresh before you try again.'))}this.pending.clear()}
 private schedule(){if(!this.active||document.hidden||this.retry)return;this.retry=setTimeout(()=>{this.retry=null;void this.connect()},Math.min(15000,500*2**Math.min(this.attempt++,5))+Math.random()*250)}
 private async connect(){
  if(!this.active||document.hidden||this.connecting||this.socket&&(this.socket.readyState===WebSocket.OPEN||this.socket.readyState===WebSocket.CONNECTING))return;
  this.connecting=true;const generation=this.generation;
  // HTTP bootstrap refreshes an expired routing cookie, never replays an action.
  try{const response=await fetch('/api/game',{cache:'no-store'});if(response.status===401){window.dispatchEvent(new Event('townies-session-ended'));return}if(!response.ok)throw new Error('Town unavailable');const value=await response.json() as any;if(generation!==this.generation)return;if(!value.resident){this.schedule();return}this.seed(value);if(!this.active||document.hidden)return;
   const ws=new WebSocket(location.origin.replace(/^http/,'ws')+'/api/town-socket');this.socket=ws;this.welcomed=false;this.nextId=0;
   ws.onmessage=event=>{if(this.socket!==ws)return;this.lastReceived=Date.now();try{this.receive(JSON.parse(event.data));if(Date.now()-this.lastAck>1000){this.lastAck=Date.now();ws.send(JSON.stringify({type:'ack',revision:this.worldRevision}))}}catch{ws.close(4000,'Resync required')}};
   ws.onerror=()=>{};
   ws.onclose=event=>{if(this.socket!==ws)return;this.socket=null;this.welcomed=false;this.failPending();this.emit('connection',false);if(event.code===4401){window.dispatchEvent(new Event('townies-session-ended'));return}this.schedule()};
  }catch{if(generation===this.generation){this.emit('connection',false);this.schedule()}}finally{if(generation===this.generation)this.connecting=false}
 }
 private receive(packet:any){
  if(packet.type==='pong')return;
  if(packet.type==='welcome'){this.world=packet.world;this.personal=packet.personal;this.worldRevision=this.personalRevision=packet.revision;this.roomPeers=null;this.welcomed=true;this.attempt=0;this.lastReceived=Date.now();this.changed();this.emit('connection',true);this.emit('social');this.emit('chat');return}
  if(packet.town&&packet.town!==this.world.town?.id)return;
  if(packet.type==='world'){if(packet.revision>this.worldRevision){this.world=packet.patch?applyPatch(this.world,packet.patch):packet.value;this.worldRevision=packet.revision;this.changed()}return}
  if(packet.type==='room'){this.roomPeers={owner:packet.owner,peers:packet.peers};this.changed();return}
  if(packet.type==='changed'){if(packet.topic==='world'){if(!this.refresh)this.refresh=setTimeout(()=>{this.refresh=null;void this.request('/api/game').then(r=>r.json()).then(()=>this.changed()).catch(()=>{})},100)}else this.emit(packet.topic,packet);return}
  if(packet.type==='personal'||packet.type==='response'){
   if(packet.personal||packet.patch){if(packet.revision>=this.personalRevision){this.personal=packet.patch?applyPatch(this.personal,packet.patch):packet.personal;this.personalRevision=packet.revision;this.changed()}}
   if(packet.type==='response'){const item=this.pending.get(packet.id);if(!item)return;clearTimeout(item.timer);this.pending.delete(packet.id);const value=packet.value??{...this.snapshot(),...packet.extras,_townRevision:packet.revision};item.resolve(new Response(JSON.stringify(value),{status:packet.status,headers:{'Content-Type':'application/json','X-Townies-Transport':'websocket'}}))}return;
  }
 }
 async request(input:string,init?:RequestInit):Promise<Response>{
  const url=new URL(input,location.origin);let body:any;try{body=typeof init?.body==='string'?JSON.parse(init.body):undefined}catch{return fetch(input,init)}
  if(!this.connected()||!['/api/game','/api/chat'].includes(url.pathname)||['join','move-town','move-options'].includes(body?.action)){
   const generation=this.generation;const response=await fetch(input,init);if(generation!==this.generation)return response;if(url.pathname==='/api/game'&&response.ok){const value=await response.clone().json() as any;if(value.resident)return new Response(JSON.stringify(this.seed(value)),{status:response.status,headers:response.headers})}return response;
  }
  const id=++this.nextId;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('The town is reconnecting. Check your progress before trying again.'));this.socket?.close(4000,'Request timed out')},10000);this.pending.set(id,{resolve,reject,timer});try{this.socket!.send(JSON.stringify({type:'request',id,path:url.pathname,search:url.search,method:init?.method??'GET',body}))}catch{clearTimeout(timer);this.pending.delete(id);reject(new Error('Connection interrupted. Please reconnect.'))}});
 }
}
export const townConnection=new TownConnection();
export const townFetch=(input:string,init?:RequestInit)=>townConnection.request(input,init);
