import {env} from 'cloudflare:workers';
import {accounts} from '../../db/auth';
import {hash} from './Town';
import type {Call} from './Town';
const cookieName='townies.town-session';
type Ticket={identity:string;session:string;expires:number};
function sessionCookie(req:Request){return (req.headers.get('cookie')??'').split(';').map(v=>v.trim()).find(v=>/^(?:__Secure-)?townies\.session_token=/.test(v))??''}
const b64=(v:Uint8Array)=>btoa(String.fromCharCode(...v)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const un64=(s:string)=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),v=>v.charCodeAt(0));
async function key(){if(!env.BETTER_AUTH_SECRET)throw new Error('Session secret unavailable');return crypto.subtle.importKey('raw',new TextEncoder().encode('town-routing-v1:'+env.BETTER_AUTH_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
async function signed(ticket:Ticket){const payload=b64(new TextEncoder().encode(JSON.stringify(ticket)));return payload+'.'+b64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(),new TextEncoder().encode(payload))))}
async function read(req:Request):Promise<Ticket|null>{try{const raw=(req.headers.get('cookie')??'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!raw)return null;const [payload,signature]=raw.split('.');if(!await crypto.subtle.verify('HMAC',await key(),un64(signature),new TextEncoder().encode(payload)))return null;const ticket=JSON.parse(new TextDecoder().decode(un64(payload))) as Ticket;return ticket.expires>Date.now()&&ticket.session===await hash(sessionCookie(req))?ticket:null}catch{return null}}
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function townRoute(req:Request):Promise<Response|null>{
 if(!env.TOWNS||!env.RESIDENTS)return env.TOWNIES_AUTH_MODE==='sites'?null:json({error:'Town servers are not configured.'},503);
 if(env.TOWNIES_MAINTENANCE==='true')return json({error:'We’re upgrading town servers. Please try again shortly.'},503);
 const origin=req.headers.get('origin');if(req.method==='POST'&&origin&&origin!==new URL(req.url).origin)return json({error:'Use your own game page.'},403);
 try{
  let ticket=await read(req),issued=false;
  if(!ticket){const session=await accounts().api.getSession({headers:req.headers});if(!session)return json({error:'Please log in to enter your town.'},401);ticket={identity:`account:${session.user.id}`,session:await hash(sessionCookie(req)),expires:Math.min(new Date(session.session.expiresAt).getTime(),Date.now()+24*60*60*1000)};await env.RESIDENTS.getByName(await hash(ticket.identity)).establish(ticket.identity,ticket.session,ticket.expires);issued=true;}
  let body:string|undefined;if(req.method==='POST'){if(Number(req.headers.get('content-length')??0)>32768)return json({error:'Request too large.'},413);const reader=req.body?.getReader();let size=0;const parts:Uint8Array[]=[];if(reader)while(true){const v=await reader.read();if(v.done)break;size+=v.value.length;if(size>32768){await reader.cancel();return json({error:'Request too large.'},413)}parts.push(v.value)}const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length}body=new TextDecoder().decode(bytes);}
  const call:Call={identity:ticket.identity,path:new URL(req.url).pathname,method:req.method,url:req.url,body};
  const result=await env.RESIDENTS.getByName(await hash(ticket.identity)).request(ticket.session,call);
  const response=new Response(result.body,result);response.headers.set('Cache-Control','no-store');response.headers.set('X-Townies-Storage','durable-object');
  if(issued)response.headers.append('Set-Cookie',`${cookieName}=${await signed(ticket)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${new URL(req.url).protocol==='https:'?'; Secure':''}`);
  return response;
 }catch(error){console.error('Town routing failed',error);return json({error:'Your town is reconnecting. Please try again.'},503)}
}
export async function revokeTownSession(req:Request,all=false){if(!env.RESIDENTS)return;const session=await accounts().api.getSession({headers:req.headers});if(!session)return;const resident=env.RESIDENTS.getByName(await hash(`account:${session.user.id}`));if(all)await resident.revokeAll();else await resident.revoke(await hash(sessionCookie(req)));}
