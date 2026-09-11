import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {chatRead,mergeChatRead,readMessages} from '../shared/chat-read.ts';

const database=new DatabaseSync(':memory:');
database.exec('CREATE TABLE residents(id TEXT, town_id TEXT, name TEXT, job TEXT, home INTEGER, token_hash TEXT); CREATE TABLE chat_messages(id TEXT, town_id TEXT, resident_id TEXT, channel TEXT, text TEXT, created INTEGER)');
globalThis.chatTestIdentity='account-a';
globalThis.chatTestDb={prepare(sql){return {bind(...values){const query=database.prepare(sql);return {first:async()=>query.get(...values),all:async()=>({results:query.all(...values)})}}}}};
const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('account-a'))).toString('hex');
const resident=database.prepare('INSERT INTO residents VALUES(?,?,?,?,?,?)');
resident.run('self','town-a','Self','mow',0,hash);resident.run('neighbor','town-a','Neighbor','mow',1,'other');resident.run('outsider','town-b','Elsewhere','garden',0,'elsewhere');
const insert=database.prepare('INSERT INTO chat_messages VALUES(?,?,?,?,?,?)');
const message=(id,channel,created,author='neighbor',town='town-a')=>insert.run(id,town,author,channel,'Hello',created);
message('old-message-00001','town',50);message('same-time-0000002','town',100);message('own-message-0001','town',110,'self');message('profession-00001','mow',100);message('other-job-000001','garden',100);message('other-town-00001','town',100,'outsider','town-b');
const result=await build({entryPoints:['server/chat.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'isolated-chat-db',setup(build){build.onResolve({filter:/^@\/db\/(raw|auth)$/},args=>({path:args.path,namespace:'chat-test'}));build.onLoad({filter:/.*/,namespace:'chat-test'},args=>({contents:args.path.endsWith('/raw')?'export const db=()=>globalThis.chatTestDb':'export const gameIdentity=async()=>globalThis.chatTestIdentity',loader:'js'}))}}]});
const {GET,POST}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
async function get(channel='town',cursor=chatRead(null),town='town-a'){
 const params=new URLSearchParams({town,channel,summary:'1',after:String(cursor.created),seen:cursor.ids.join(',')});const response=await GET(new Request('https://townies.test/api/chat?'+params));return {status:response.status,...await response.json()};
}
assert.deepEqual(await get(),{status:200,unread:2},'Exclude own messages and other towns/channels');
assert.deepEqual(await get('mow'),{status:200,unread:1});
assert.equal((await get('garden')).status,403,'No unauthorized profession metadata');
assert.equal((await get('town',chatRead(null),'town-b')).status,409,'No previous-town metadata');
const cursor=readMessages([{id:'old-message-00001',created:50},{id:'same-time-0000002',created:100}]);
assert.equal((await get('town',cursor)).unread,0);
message('same-time-0000001','town',100);
assert.equal((await get('town',cursor)).unread,1,'A later arrival in the same millisecond must stay unread regardless of ID order');
const read=mergeChatRead(cursor,readMessages([{id:'same-time-0000001',created:100}]));assert.equal((await get('town',read)).unread,0);
assert.deepEqual(mergeChatRead(read,chatRead(null)),read,'Older tabs cannot rewind read progress');
assert.deepEqual(chatRead({created:Infinity,ids:['bad sql','same-time-0000001']}),{created:0,ids:['same-time-0000001']});
// Moderation is enforced by the shared HTTP/WebSocket handler before a write.
for(const channel of ['town','mow']){
 const response=await POST(new Request('https://townies.test/api/chat',{method:'POST',headers:{origin:'https://townies.test','content-type':'application/json'},body:JSON.stringify({id:'blocked-message-'+channel,channel,text:'f.u.c.k',townId:'town-a'})}));
 assert.equal(response.status,400);assert.match((await response.json()).error,/without profanity/);
}
assert.equal(database.prepare("SELECT COUNT(*) AS n FROM chat_messages WHERE id LIKE 'blocked-message-%'").get().n,0);
globalThis.chatTestIdentity=null;assert.equal((await get()).status,401);
database.close();delete globalThis.chatTestDb;delete globalThis.chatTestIdentity;
console.log('PASS: unread counts, own-message exclusion, channel/town/account authorization, same-time arrivals, and monotonic read cursors.');
