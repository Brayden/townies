import assert from 'node:assert/strict';
import {furniturePlacement} from '../app/game/furniturePlacement.ts';
import {placementIssue,starterInterior} from '../app/game/interiors.ts';
const placed=starterInterior().placed;
let state,previews,commits,cancels;
function setup(draft=null){state={editing:true,locked:false,draft};previews=[];commits=[];cancels=0;return furniturePlacement({state:()=>state,select:id=>state.draft={...placed.find(p=>p.id===id)},preview:p=>{state.draft=p;previews.push(p);},commit:p=>{if(!placementIssue(p,placed))commits.push(p);},cancel:()=>{state.draft=null;cancels++;}});}
const event=(x,z,screenX=0,id=1)=>({id,x:screenX,y:0,point:{x,z}});
const fern={id:'plant-fern',x:3,z:2,rotation:0};
// Buying follows the cursor without committing; click applies the final snapped point.
let control=setup({...fern});control.move(event(-.24,.74),true);assert.equal(state.draft.x,0);assert.equal(state.draft.z,.5);assert.equal(commits.length,0);
control.down(event(-.24,.74),null);control.up(event(-.24,.74),true);assert.equal(commits.length,1);assert.equal(commits[0].z,.5);
// A click selects existing furniture without saving; drag preserves the grab offset.
control=setup();control.down(event(3.3,2.2),'plant-fern');control.up(event(3.3,2.2),true);assert.equal(commits.length,0);assert.equal(state.draft.id,'plant-fern');
control=setup();control.down(event(3.3,2.2),'plant-fern');control.move(event(.3,.2,25),false);assert.equal(control.dragging,true);assert.equal(state.draft.x,0);assert.equal(state.draft.z,0);control.up(event(.3,.2,25),true);assert.equal(commits.length,1);assert.equal(commits[0].x,0);
// Small hand movement selects only; it does not accidentally charge or save.
control=setup();control.down(event(3,2),'plant-fern');control.move(event(3.1,2,4),false);control.up(event(3.1,2,4),true);assert.equal(commits.length,0);
// Touch has no hover movement, but sliding a selected catalog item places on release.
control=setup({...fern});control.move(event(0,0),false);assert.equal(previews.length,0);control.down(event(1,1),null);control.move(event(0,0,30),false);control.up(event(0,0,30),true);assert.equal(commits.length,1);
// Invalid drops remain previews and never commit a blocked/out-of-room position.
control=setup({...fern});control.down(event(-3,-2),null);control.up(event(-3,-2),true);assert.equal(commits.length,0);assert.ok(placementIssue(state.draft,placed));
control=setup({...fern});control.down(event(20,20),null);control.up(event(20,20),true);assert.equal(commits.length,0);
// Releasing over the editor, losing capture, or locking during a gesture cannot apply it.
control=setup({...fern});control.down(event(0,0),null);control.up(event(0,0),false);assert.equal(commits.length,0);assert.equal(cancels,1);
control=setup({...fern});control.down(event(0,0),null);control.cancel();control.up(event(0,0),true);assert.equal(commits.length,0);assert.equal(state.draft,null);
control=setup({...fern});control.down(event(0,0),null);state.locked=true;control.up(event(0,0),true);assert.equal(commits.length,0);
// A second pointer cannot hijack a drag. Rotation/floor stay attached to the piece.
control=setup({...fern,level:1});control.down(event(0,0),null);control.move(event(3,3,25,2),false);control.up(event(3,3,25,2),true);assert.equal(control.active,true);state.draft.rotation=90;control.move(event(1,1,25),false);assert.equal(state.draft.level,1);assert.equal(state.draft.rotation,90);control.cancel();
console.log('Furniture placement gestures passed: hover, click, drag, touch, invalid drops, cancellation, locks, and multiple pointers.');
