import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {electionWindow} from '../app/game/elections.ts';
import {readElection,electionAction} from '../db/elections.ts';
const at=s=>Date.parse(s+'Z');
for(const [date,active,cycle,closed] of [
 ['2026-09-20T23:59:59',false,'2026-09','2026-08'],['2026-09-21T00:00:00',true,'2026-09','2026-08'],['2026-09-30T23:59:59',true,'2026-09','2026-08'],['2026-10-01T00:00:00',false,'2026-10','2026-09'],['2026-10-31T00:00:00',false,'2026-11','2026-10'],['2027-02-28T23:59:59',true,'2027-02','2027-01'],['2027-03-01T00:00:00',false,'2027-03','2027-02'],['2028-02-29T23:59:59',true,'2028-02','2028-01'],['2026-12-31T00:00:00',false,'2027-01','2026-12']]){
 const w=electionWindow(at(date));assert.equal(w.active,active,date);assert.equal(w.cycle,cycle,date);assert.equal(w.lastClosedCycle,closed,date);
}
assert.equal(electionWindow(at('2026-09-20T23:59:59')).daysUntil,1);
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
const d={prepare(sql){
 const stmt=sqlite.prepare(sql);let args=[];
 return {
  bind(...a){args=a;return this},
  async first(){return stmt.get(...args)??null},
  async all(){return {results:stmt.all(...args)}},
  async run(){return {meta:{changes:Number(stmt.run(...args).changes)}}}
 };
}};
for(const id of ['town-a','town-b'])sqlite.prepare('INSERT INTO towns(id,name,created) VALUES(?,?,?)').run(id,id,0);
const voters=[['alice','town-a',0],['bea','town-a',1],['chris','town-a',2],['dana','town-b',0],['new','town-a',null]].map(([id,town_id,home])=>({id,town_id,home,job:home===null?null:'paper'}));
for(const r of voters)sqlite.prepare('INSERT INTO residents(id,token_hash,town_id,name,color,home,job,seen,created) VALUES(?,?,?,?,?,?,?,?,?)').run(r.id,r.id,r.town_id,r.id,'#fff',r.home,r.job,0,0);
const [a,b,c,other,newcomer]=voters,pre=at('2026-09-10T00:00:00'),open=at('2026-09-21T00:00:00'),close=at('2026-10-01T00:00:00');
assert.equal((await readElection(d,a,pre)).mayor,null);
assert.equal((await electionAction(d,newcomer,'nominate','2026-09',null,pre)).status,400);
assert.equal(await electionAction(d,a,'nominate','2026-09',null,pre),null);
await Promise.all([electionAction(d,a,'nominate','2026-09',null,pre+1),electionAction(d,b,'nominate','2026-09',null,pre+2)]);
assert.equal((await readElection(d,a,pre)).candidates.length,2);
await electionAction(d,other,'nominate','2026-09',null,pre);
assert.equal((await electionAction(d,a,'vote','2026-09',b.id,pre)).status,409);
assert.equal((await electionAction(d,a,'vote','2026-08',b.id,open)).status,409);
assert.equal((await electionAction(d,a,'vote','2026-09',other.id,open)).status,400);
assert.equal((await electionAction(d,newcomer,'vote','2026-09',a.id,open)).status,400);
assert.equal(await electionAction(d,c,'nominate','2026-09',null,open),null,'Nominations remain open during voting');
await Promise.all([electionAction(d,a,'vote','2026-09',b.id,open),electionAction(d,a,'vote','2026-09',a.id,open+1)]);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM election_votes WHERE voter_id=?').get(a.id).n,1);
assert.equal((await readElection(d,a,open)).myVote,a.id);
await electionAction(d,b,'vote','2026-09',b.id,open);
assert.equal((await readElection(d,a,open)).mayor,null,'No early mayor while polls are open');
assert.equal((await readElection(d,a,close)).mayor.id,a.id,'Tied votes select the earlier nominee');
await electionAction(d,c,'vote','2026-09',b.id,open+100);
assert.equal((await readElection(d,a,close)).mayor.id,b.id,'Highest vote total wins');
assert.equal((await electionAction(d,c,'vote','2026-09',a.id,close)).status,409,'Closed ballot is immutable');
assert.equal((await readElection(d,other,close)).mayor,null,'No cross-town result leak');
await electionAction(d,a,'nominate','2026-10',null,close);
assert.equal((await readElection(d,a,at('2026-11-01T00:00:00'))).mayor.id,b.id,'No-vote month retains previous mayor');
assert.equal((await readElection(d,a,close)).myVote,null,'New election clears personal vote status');
assert.equal((await readElection(d,a,close)).candidates.length,1,'Ballots are independent each month');
assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
console.log('PASS: UTC boundaries, February/leap years, rollover, migration integrity, nomination deduplication, one changeable vote per resident, town isolation, eligibility, closed ballots, deterministic ties, and retained mayors.');
sqlite.close();
