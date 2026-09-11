import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {chromium} from '/Users/brayden/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

// Exercise the real React hook and chat handler with isolated browser stores and SQLite.
const db=new DatabaseSync(':memory:');
db.exec('CREATE TABLE residents(id TEXT,town_id TEXT,name TEXT,job TEXT,home INTEGER,token_hash TEXT); CREATE TABLE chat_messages(id TEXT,town_id TEXT,resident_id TEXT,channel TEXT,text TEXT,created INTEGER)');
db.exec(readFileSync('drizzle/0019_huge_warbird.sql','utf8'));
const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('reader-account'))).toString('hex');
db.prepare('INSERT INTO residents VALUES(?,?,?,?,?,?)').run('reader','town-a','Reader','mow',0,hash);
db.prepare('INSERT INTO residents VALUES(?,?,?,?,?,?)').run('author','town-a','Author','mow',1,'neighbor');
const add=(id,created,channel='town')=>db.prepare('INSERT INTO chat_messages VALUES(?,?,?,?,?,?)').run(id,'town-a','author',channel,'Hello',created);
add('old-message-00001',100);add('profession-00001',100,'mow');
globalThis.chatSyncDb={prepare(sql){return {bind(...args){const q=db.prepare(sql);return {first:async()=>q.get(...args),all:async()=>({results:q.all(...args)})}}}}};
const api=await build({entryPoints:['server/chat.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'test-db',setup(b){b.onResolve({filter:/^@\/db\/(raw|auth)$/},a=>({path:a.path,namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path.endsWith('/raw')?'export const db=()=>globalThis.chatSyncDb':"export const gameIdentity=async()=> 'reader-account'",loader:'js'}))}}]});
const {GET,POST}=await import('data:text/javascript;base64,'+Buffer.from(api.outputFiles[0].text).toString('base64'));
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {useChatUnread} from './app/game/useChatUnread';let root;function App(){window.unread=useChatUnread('reader','town-a','mow',true);return null}window.mount=()=>{root=createRoot(document.getElementById('root'));root.render(React.createElement(App))};window.unmount=()=>root.unmount();window.mount();`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'iife',platform:'browser',write:false,plugins:[{name:'test-transport',setup(b){b.onResolve({filter:/^\.\/town-connection$/},()=>({path:'transport',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`const listeners=new Set();window.notify=()=>listeners.forEach(fn=>fn({}));export const townConnection={connected:()=>true,on:(topic,fn)=>{listeners.add(fn);return()=>listeners.delete(fn)}};export const townFetch=async(input,init)=>{const r=await window.callApi(input,init);return new Response(JSON.stringify(r.body),{status:r.status})};`,loader:'js'}))}}]});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const pages=[];let failRead=false,reads=0,pauseSummary=false,releaseSummary;
const notify=()=>Promise.all(pages.map(p=>p.evaluate(()=>window.notify?.())));
async function device(){
 const context=await browser.newContext();const page=await context.newPage();pages.push(page);
 await page.exposeFunction('callApi',async(input,init)=>{
  if(init?.method==='POST'&&JSON.parse(init.body).action==='read'){reads++;if(failRead)return {status:503,body:{error:'offline'}}}
  const req=new Request('https://townies.test'+input,{...init,headers:{origin:'https://townies.test','content-type':'application/json'}});
  const res=await (init?.method==='POST'?POST:GET)(req);const body=await res.json();
  if(pauseSummary&&input.includes('summary=1')&&input.includes('channel=town')){pauseSummary=false;await new Promise(r=>releaseSummary=r)}
  if(body.changed)void notify();
  return {status:res.status,body};
 });
 await page.route('https://townies.test/',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div><script>'+bundle.outputFiles[0].text+'</script>'}));
 await page.goto('https://townies.test/');return page;
}
const count=(page,town,mow=1)=>page.waitForFunction(({town,mow})=>window.unread?.counts.town===town&&window.unread?.counts.mow===mow,{town,mow});
const read=(page,id,created,channel='town')=>page.evaluate(({id,created,channel})=>window.unread.markRead(channel,[{id,created}]),{id,created,channel});
try{
 const a=await device();await count(a,1);
 await read(a,'old-message-00001',100);await count(a,0);
 // A separate browser context has no local storage or login-era in-memory state.
 const b=await device();await count(b,0);
 add('new-message-00001',200);await notify();await Promise.all([count(a,1),count(b,1)]);
 await read(b,'new-message-00001',200);await Promise.all([count(a,0),count(b,0)]);
 await a.evaluate(()=>{window.unmount();localStorage.clear();window.mount()});await count(a,0);
 add('new-message-00002',300);await notify();await Promise.all([count(a,1),count(b,1)]);
 // An unavailable connection retains the pending read locally and retries later.
 failRead=true;await read(a,'new-message-00002',300);await count(a,0);
 await new Promise(r=>setTimeout(r,100));failRead=false;await notify();await count(b,0);
 // A stale unread response must not restore the badge after a newer read.
 add('new-message-00003',400);pauseSummary=true;void a.evaluate(()=>window.notify());
 while(!releaseSummary)await new Promise(r=>setTimeout(r,10));
 await read(a,'new-message-00003',400);releaseSummary();await Promise.all([count(a,0),count(b,0)]);
 await read(a,'profession-00001',100,'mow');await Promise.all([count(a,0,0),count(b,0,0)]);
 await a.evaluate(()=>{window.unmount();localStorage.setItem('townies-chat-read-v1:reader:town-a:town',JSON.stringify({created:400,ids:['new-message-00003','missing-message-0001']}));window.mount()});await count(a,0,0);
 const before=reads;await notify();await new Promise(r=>setTimeout(r,150));assert.equal(reads,before,'Already synchronized reads do not cause write/notification loops');
 console.log('PASS: independent devices, live read synchronization, logout/remount without local storage, pending-read retries, stale responses, channel isolation, and no write loops.');
}finally{await browser.close();db.close();delete globalThis.chatSyncDb}
