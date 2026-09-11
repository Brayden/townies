import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,writeFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
const base=process.env.TOWNIES_TEST_URL??'http://localhost:3002';if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))throw new Error('Local migration fixtures only.');
const root=process.env.TOWNIES_STATE_DIR??'.wrangler/state/v3';let d1;
for(const file of readdirSync(root+'/d1/miniflare-D1DatabaseObject').filter(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite')){const d=new DatabaseSync(`${root}/d1/miniflare-D1DatabaseObject/${file}`);if(d.prepare("SELECT 1 FROM sqlite_master WHERE name='auth_users'").get()){d1=d;break}d.close()}
assert.ok(d1);d1.prepare("DELETE FROM auth_rate_limits WHERE key LIKE '%|/sign-up/email'").run();
let cookie='';const signup=await fetch(base+'/api/auth/sign-up/email',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({name:'Migration resident',email:`migration-${Date.now()}@example.com`,password:'Migrating a lovely town 42!'})});assert.equal(signup.status,200);cookie=signup.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');const user=(await signup.json()).user;
const town=randomUUID(),historicalTown=randomUUID(),resident=randomUUID(),former=randomUUID(),now=Date.now(),cut=now-3600000;
d1.prepare('INSERT INTO towns(id,name,invite,private,treasury,project,farm_funded,created) VALUES(?,?,?,?,?,?,?,?)').run(town,'Existing test town',randomUUID().replaceAll('-','').slice(0,16),1,789,40,250,now-86400000);
d1.prepare('INSERT INTO towns(id,name,private,created) VALUES(?,?,1,?)').run(historicalTown,'Former neighbor town',now);
d1.prepare('INSERT INTO residents(id,token_hash,town_id,name,color,home,job,coins,xp,house,items,seen,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(resident,createHash('sha256').update('account:'+user.id).digest('hex'),town,'Migration resident','#eebd77',4,'mow',4321,987,'rose-4','["bike"]',now,now);
d1.prepare('INSERT INTO residents(id,token_hash,town_id,name,color,home,job,seen,created) VALUES(?,?,?,?,?,?,?,?,?)').run(former,randomUUID(),historicalTown,'Former neighbor','#eebd77',3,'paper',0,now);
d1.prepare('INSERT INTO lawn_cells(key,town_id,cell,cut_at) VALUES(?,?,?,?)').run(town+':fixture',town,'fixture',cut);
d1.prepare('INSERT INTO contributions(town_id,resident_id,day,xp,mow,tax) VALUES(?,?,?,?,?,?)').run(town,former,'2026-08-01',20,20,20);
d1.prepare('INSERT INTO chat_messages(id,town_id,resident_id,channel,text,created) VALUES(?,?,?,?,?,?)').run(randomUUID(),town,former,'town','A memory from before the move',now);
async function get(){const r=await fetch(base+'/api/game',{headers:{Cookie:cookie}});for(const c of r.headers.getSetCookie())cookie+='; '+c.split(';')[0];assert.equal(r.status,200);assert.equal(r.headers.get('x-townies-storage'),'durable-object');return r.json()}
let state=await get();assert.equal(state.town.id,town);assert.equal(state.town.residents,1);assert.equal(state.resident.coins,4321);assert.equal(state.resident.home,4);assert.equal(state.resident.house,'rose-4');assert.equal(state.resident.xp,987);assert.equal(state.town.treasury,789);assert.equal(state.town.project,40);assert.deepEqual(state.grassHistory,[{cell:'fixture',cut_at:cut}]);
// Import is one-time: stale source changes cannot overwrite the durable town.
d1.prepare('UPDATE residents SET coins=0 WHERE id=?').run(resident);d1.prepare('DELETE FROM lawn_cells WHERE town_id=?').run(town);state=await get();assert.equal(state.resident.coins,4321);assert.equal(state.grassHistory[0].cut_at,cut);
const chat=await fetch(base+'/api/chat?channel=town&town='+town,{headers:{Cookie:cookie}});assert.equal(chat.status,200);assert.equal((await chat.json()).messages[0].name,'Former neighbor');
writeFileSync('/tmp/townies-do-restart-fixture.json',JSON.stringify({base,cookie,town,coins:4321,cut}),{mode:0o600});
console.log('PASS: existing D1 town imports once with home, career, coins, XP, town funds, exact grass timestamps, and historical references to departed residents. Restart fixture saved locally.');d1.close();
