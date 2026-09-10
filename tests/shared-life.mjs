import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import * as THREE from 'three';
import {sharedLifeAction,readSharedLife} from '../db/sharedLife.ts';
import {CROPS,FARM_BEDS,FARM_ORDER,PICNIC,PICNIC_BASKET,BASKET_REWARD,cropStage,mergeFarmPlots} from '../app/game/sharedLife.ts';
import {sharedLifeScenery,animateLifeGesture} from '../app/game/sharedLifeScenery.ts';
import {EMPTY_PLANNING,townLayout} from '../app/game/charters.ts';
import {isTownBlocked} from '../app/game/townLayout.ts';
import {findPath} from '../app/game/pathfinding.ts';
import {isGrassGround} from '../app/game/data.ts';
import {moveTown} from '../db/moving.ts';
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
const d={prepare(query){const stmt=sql.prepare(query);let args=[];return{bind(...a){args=a;return this},async first(){return stmt.get(...args)??null},async all(){return{results:stmt.all(...args)}},execute(){return{meta:{changes:Number(stmt.run(...args).changes)}}},async run(){return this.execute()}}},async batch(statements){sql.exec('BEGIN');try{const results=statements.map(s=>s.execute());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};


let now=Date.parse('2026-09-10T12:00:00Z');
sql.exec("INSERT INTO towns(id,name,created) VALUES('town','Town',0),('other','Other',0);INSERT INTO residents(id,token_hash,town_id,name,color,home,job,seen,created) VALUES('a','a','town','Alice','#fff',0,'mow',0,0),('b','b','town','Bob','#fff',1,'paper',0,0),('c','c','other','Carol','#fff',0,'garden',0,0)");
const row=id=>sql.prepare('SELECT * FROM residents WHERE id=?').get(id),at=(id,p)=>sql.prepare('UPDATE residents SET x=?,z=? WHERE id=?').run(p.x,p.z,id);
const act=(id,action,body={})=>sharedLifeAction(d,row(id),{action,...body},now),state=(id='a')=>readSharedLife(d,row(id).town_id,id,now);
const bed=FARM_BEDS[0],plant={target:bed.id,crop:'radish',revision:0};
assert.equal(FARM_BEDS.length,24);assert.equal(new Set(FARM_BEDS.map(b=>b.id)).size,24);
at('a',bed);assert.equal((await act('a','life-plant',plant)).status,409,'Farm must be funded');
sql.exec("UPDATE towns SET farm_funded=6000 WHERE id='town'");at('b',bed);
const racing=await Promise.all([act('a','life-plant',plant),act('b','life-plant',plant)]);assert.equal(racing.filter(v=>v===null).length,1);
let life=await state();assert.equal(life.plots[0].revision,1);assert.equal(cropStage(life.plots[0],now),'thirsty');assert.equal((await act('a','life-plant',{...plant,crop:'pumpkin',revision:1})).status,409,'Cannot uproot neighbors');
assert.equal((await act('a','life-harvest',{...plant,revision:1})).status,409,'Cannot harvest unwatered plants');
at('a',{x:0,z:6});assert.equal((await act('a','life-water',{target:bed.id,revision:1})).status,400);
assert.equal(await act('b','life-water',{target:bed.id,revision:1}),null,'Neighbor can water');assert.equal((await act('b','life-water',{target:bed.id,revision:1})).status,409,'Water only once');
life=await state();assert.equal(cropStage(life.plots[0],now),'growing');now+=600000-1;
assert.equal((await act('b','life-harvest',{...plant,revision:2})).status,409,'Authoritative growth boundary');now++;
at('a',bed);const harvesting=await Promise.all([act('a','life-harvest',{...plant,revision:2}),act('b','life-harvest',{...plant,revision:2})]);assert.equal(harvesting.filter(v=>v===null).length,1);
life=await state();assert.equal(life.pantry.radish,4);assert.equal(life.plots[0].crop,null);assert.equal(life.plots[0].revision,3);assert.equal(mergeFarmPlots([{...life.plots[0],revision:2,crop:'radish'}],life.plots)[0].crop,null,'Late snapshot cannot restore harvested crops');assert.equal(row('a').coins,150,'A hobby does not create personal wages');
assert.equal((await act('a','life-plant',plant)).status,409,'Old revision cannot regrow an empty bed');assert.equal(await act('a','life-plant',{...plant,crop:'pumpkin',revision:3}),null);
assert.equal(await act('a','life-water',{target:bed.id,revision:4}),null);now+=86400000*10;
assert.equal(cropStage((await state()).plots[0],now),'ready','No withering when away');assert.equal(await act('b','life-harvest',{target:bed.id,crop:'pumpkin',revision:5}),null);
at('a',FARM_ORDER);assert.equal((await act('a','life-basket')).status,409,'Insufficient pantry');
for(const c of CROPS)sql.prepare('INSERT INTO farm_pantry(town_id,crop,amount) VALUES(?,?,?) ON CONFLICT(town_id,crop) DO UPDATE SET amount=excluded.amount').run('town',c.id,PICNIC_BASKET[c.id]);
at('b',FARM_ORDER);const orders=await Promise.all([act('a','life-basket'),act('b','life-basket')]);assert.equal(orders.filter(v=>v===null).length,1);life=await state();assert.ok(life.basketCompleted);assert.ok(Object.values(life.pantry).every(v=>v===0));assert.equal(sql.prepare("SELECT treasury FROM towns WHERE id='town'").get().treasury,BASKET_REWARD);
assert.equal((await state('c')).basketCompleted,0);assert.deepEqual((await state('c')).pantry,{});
at('a',PICNIC);at('b',PICNIC);assert.equal(await act('a','life-picnic'),null);assert.equal(await act('a','life-picnic'),null);assert.equal(await act('b','life-picnic'),null);life=await state();assert.equal(life.picnicGuests.length,2);assert.equal(life.visited,true);assert.equal(row('a').emote,'sit');await act('a','life-picnic',{stand:true});assert.equal(row('a').emote,null);await act('a','life-picnic');
at('c',PICNIC);assert.equal(await act('c','life-picnic'),null,'Picnic is open even without farm');assert.equal((await state('c')).picnicGuests.length,1);
assert.equal((await act('a','life-emote',{gesture:'hack'})).status,400);now+=3000;assert.equal(await act('a','life-emote',{gesture:'dance'}),null);assert.equal((await act('a','life-emote',{gesture:'wave'})).status,409);assert.equal(row('a').emote,'dance');assert.equal(row('a').emote_until,now+5000);
const stale=row('a');assert.equal(await moveTown(d,stale,{fromTown:'town',membership:0,destination:'other',home:1},now),null);assert.equal(row('a').emote,null);assert.equal((await sharedLifeAction(d,stale,{action:'life-picnic'},now)).status,409,'Stale membership cannot join old picnic');assert.equal((await state('a')).visited,false);
now+=86400000;assert.equal((await state('b')).picnicGuests.length,0);assert.equal((await state('b')).basketCompleted,0);
// A later statement failure rolls back harvest and shared resources together.
at('b',bed);await act('b','life-plant',{...plant,revision:6});await act('b','life-water',{target:bed.id,revision:7});now+=600000;
sql.exec("CREATE TRIGGER reject_harvest BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT,'test rollback');END");await assert.rejects(act('b','life-harvest',{...plant,revision:8}));assert.equal((await state('b')).plots[0].crop,'radish');assert.equal((await state('b')).pantry.radish,0);sql.exec('DROP TRIGGER reject_harvest');
// Every physical activity can be reached from town without crossing locked water/buildings.
const layout=townLayout({...EMPTY_PLANNING,farmFunded:6000}),blocked=(x,z)=>isTownBlocked(x,z,layout);
for(const target of [PICNIC,FARM_ORDER,...FARM_BEDS]){assert.equal(blocked(target.x,target.z),false,target.id);const path=findPath({x:0,z:6},target,blocked);assert.ok(path.length,target.id);const last=path.at(-1);assert.ok(Math.hypot(last.x-target.x,last.z-target.z)<1.9,target.id);}
assert.equal(isGrassGround(PICNIC.x,PICNIC.z),false);
const scene=new THREE.Scene(),art=sharedLifeScenery(scene,true,false);let visual={...(await state('b')),basketCompleted:now,picnicGuests:[{id:'b',name:'Bob'}]};art.update(visual,now);let box=new THREE.Box3().setFromObject(art.root);assert.ok(Number.isFinite(box.min.x));art.update({...visual,plots:[]},now+1000);art.dispose();assert.equal(scene.children.length,0);
const g=new THREE.Group();g.userData.arms=[new THREE.Mesh(),new THREE.Mesh()];animateLifeGesture(g,{emote:'wave',emoteUntil:now+5000},now,false);assert.ok(g.userData.arms[1].rotation.z<0);animateLifeGesture(g,{emote:'wave',emoteUntil:now+5000},now+6000,false);assert.equal(g.userData.arms[1].rotation.z,0);
console.log('PASS: shared crop lifecycle, 24 reachable beds, neighbor tending, concurrent claims, time boundaries, no withering, pantry order atomicity and rollback, town isolation, daily picnic guest book, gestures, stale membership, moves, scenery and cleanup.');
