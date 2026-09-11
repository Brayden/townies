import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {hasProfanity,CHAT_LANGUAGE_ERROR,NAME_LANGUAGE_ERROR,TOWN_LANGUAGE_ERROR} from '../server/profanity.ts';

for(const value of ['fuck','FUCK','Fück','ｆｕｃｋ','f.u.c.k','f---uck','f u c k','f\nu\nc\nk','f\u200buck','fu\u202eck','fuuuuuck','ʃṳ𝒸𝗄','sh1t','b!tch','asshole','nigger','faggot','Dickinson fuck'])assert.equal(hasProfanity(value),true,JSON.stringify(value));
for(const value of ['Brayden','Cassandra','Scunthorpe','Penistone','Dickinson','Dickson','Annalise','Analise','Annalisa','Hancock','Cassidy','Samantha','Satoshi','Michelle','Nigel','Sexton','Kiki','Fanny','Randy','Cockburn','Humphrey','Cassian','Nasser','Janus','Titus','Mélanie','José','李明','مريم','Can you assist with the grass?','There are grapes and cucumbers in the garden','The birch trees are beautiful','I can push it tomorrow','Let’s meet at the library','I am gay','I am transgender','I am bisexual','My pronouns are she/her','black cat','Japanese garden','cocktail','class assignment'])assert.equal(hasProfanity(value),false,JSON.stringify(value));

// Exercise the actual DM write path, allowing only the friendship lookup.
const social=await build({entryPoints:['db/social.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {socialAction}=await import('data:text/javascript;base64,'+Buffer.from(social.outputFiles[0].text).toString('base64'));
let writes=0;
const database={prepare(sql){if(/^(INSERT|UPDATE|DELETE)/.test(sql))writes++;return {bind(){return {first:async()=>({accepted:1})}}}}};
const result=await socialAction(database,{id:'a',town_id:'town-a',home:0},{action:'message',to:'b',id:'message-id-00001',text:'sh1t'});
assert.equal(result.error,CHAT_LANGUAGE_ERROR);assert.equal(writes,0);

// Inspect the real Better Auth configuration with only its environment stubbed.
const auth=await build({entryPoints:['db/auth.ts'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,plugins:[{name:'local-auth-env',setup(build){build.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));build.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`export const env={BETTER_AUTH_SECRET:'local-test-secret-with-more-than-32-characters',BETTER_AUTH_URL:'https://townies.test',DB:{}}`,loader:'js'}))}}]});
// File URL import preserves normal package resolution for Better Auth.
const {mkdir,writeFile}=await import('node:fs/promises');await mkdir('outputs/moderation-qa',{recursive:true});await writeFile('outputs/moderation-qa/auth.mjs',auth.outputFiles[0].text);
const {accounts}=await import('../outputs/moderation-qa/auth.mjs');
const hooks=accounts().options.databaseHooks.user;
await assert.rejects(hooks.create.before({name:'f.u.c.k'}),error=>error.message===NAME_LANGUAGE_ERROR);
await assert.rejects(hooks.update.before({name:'sh1t'}),error=>error.message===NAME_LANGUAGE_ERROR);
await hooks.create.before({name:'Cassandra'});await hooks.update.before({email:'unchanged-name@example.com'});

const coordinatorBundle=await build({entryPoints:['server/towns/ResidentCoordinator.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'isolated-join',setup(build){
 build.onResolve({filter:/^cloudflare:workers$/},()=>({path:'worker',namespace:'join-test'}));
 build.onResolve({filter:/^\.\/Town$/},args=>args.importer.endsWith('ResidentCoordinator.ts')?{path:'hash',namespace:'join-test'}:undefined);
 build.onLoad({filter:/.*/,namespace:'join-test'},args=>({contents:args.path==='worker'?'export class DurableObject{constructor(ctx,env){this.ctx=ctx;this.env=env}}':'export const hash=async value=>value',loader:'js'}));
}}]});
const {ResidentCoordinator}=await import('data:text/javascript;base64,'+Buffer.from(coordinatorBundle.outputFiles[0].text).toString('base64'));
let touchedStorage=false;
const coordinator=new ResidentCoordinator({storage:{kv:{get:()=>undefined}}},{DB:{prepare(){touchedStorage=true;throw Error('Unexpected database write')}}});
await assert.rejects(coordinator.join('account',{name:'f.u.c.k',mode:'private',townName:'Meadow'}),{message:NAME_LANGUAGE_ERROR});
await assert.rejects(coordinator.join('account',{name:'Cassandra',mode:'private',townName:'sh1t'}),{message:TOWN_LANGUAGE_ERROR});
assert.equal(touchedStorage,false,'Invalid names must not create partial towns or residents');
console.log('PASS: profanity/evasion and benign-text checks, DM/chat rejection, account name hooks, and town joins rejected before storage.');
