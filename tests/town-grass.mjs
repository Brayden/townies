import assert from 'node:assert/strict';
import {isTownBlocked} from '../app/game/townLayout.ts';
import {LAWN_CELLS,sweptGrass,isGrassGround,HOMES,TASKS} from '../app/game/data.ts';
const town=LAWN_CELLS.filter(c=>c.id.startsWith('town-grass:'));
assert.ok(town.length>4000);
assert.equal(new Set(LAWN_CELLS.map(c=>c.id)).size,LAWN_CELLS.length);
assert.equal(LAWN_CELLS.filter(c=>c.id.startsWith('mow-')).length,80);
assert.ok(town.every(c=>isGrassGround(c.x,c.z)));
assert.ok(LAWN_CELLS.every(c=>!isTownBlocked(c.x,c.z)),'No grass inside buildings or water');
assert.ok(town.every(c=>!(c.x>23.1&&c.x<32.9)));
for(const [x,z] of [[-51,-35],[47,-38],[-46,36],[47,36],[-35,-8],[-35,10]])assert.ok(town.some(c=>Math.hypot(c.x-x,c.z-z)<4),`Grass should grow near ${x},${z}`);
// Compare the spatial lookup with the complete geometric answer across varied routes.
for(let i=0;i<150;i++){
 const ax=-58+(i*17.31)%116,az=-52+(i*9.27)%102,bx=ax+Math.sin(i)*6,bz=az+Math.cos(i)*6;
 const dx=bx-ax,dz=bz-az,length=dx*dx+dz*dz;
 const expected=LAWN_CELLS.filter(c=>{const t=Math.max(0,Math.min(1,((c.x-ax)*dx+(c.z-az)*dz)/length));return Math.hypot(c.x-ax-t*dx,c.z-az-t*dz)<.62}).map(c=>c.id).sort();
 assert.deepEqual(sweptGrass(ax,az,bx,bz).map(c=>c.id).sort(),expected);
}
assert.deepEqual(sweptGrass(4,12,4,12),[]);
console.log(`PASS: ${town.length} mowable town grass patches, coverage across all neighborhoods, protected roads and buildings, stable original IDs, and accurate spatial cutting queries.`);
