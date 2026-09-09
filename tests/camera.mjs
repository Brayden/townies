import assert from 'node:assert/strict';
import {screenToGround,cameraOffset,clampPitch,DEFAULT_PITCH} from '../app/game/camera.ts';
import {installCameraGestures,angleDelta} from '../app/game/cameraGestures.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(let i=0;i<16;i++){const yaw=i*Math.PI/8,right=screenToGround(1,0,yaw),forward=screenToGround(0,-1,yaw),view=cameraOffset(yaw,DEFAULT_PITCH);close(Math.hypot(right.x,right.z),1);close(right.x*forward.x+right.z*forward.z,0);assert.ok(forward.x*view.x+forward.z*view.z<0);assert.ok(view.y>0)}
assert.ok(clampPitch(-100)>0);assert.ok(clampPitch(100)<Math.PI/2);close(angleDelta(Math.PI-.01,-Math.PI+.01),.02);
class Canvas extends EventTarget{captures=new Set();setPointerCapture(id){this.captures.add(id)}hasPointerCapture(id){return this.captures.has(id)}releasePointerCapture(id){this.captures.delete(id)}}
const canvas=new Canvas(),calls={pan:[],orbit:[],zoom:[],tap:[]};let mode='pan';
const cleanup=installCameraGestures(canvas,{mode:()=>mode,viewHeight:()=>30,...Object.fromEntries(Object.keys(calls).map(key=>[key,(...args)=>calls[key].push(args)]))});
function send(type,x=0,y=0,id=1,extra={}){const e=new Event(type,{cancelable:true});Object.assign(e,{clientX:x,clientY:y,pointerId:id,button:0,shiftKey:false,...extra});canvas.dispatchEvent(e);return e}
send('pointerdown');send('pointerup',2,2);assert.equal(calls.tap.length,1);
send('pointerdown');send('pointermove',20,10);send('pointermove',0,0);send('pointerup');assert.equal(calls.pan.length,2);assert.equal(calls.tap.length,1,'A drag returning to its origin must not become a walk tap');
send('pointerdown',0,0,1,{button:2});send('pointermove',20,10,1,{button:2});send('pointerup',20,10,1,{button:2});assert.ok(calls.orbit.length);assert.equal(calls.tap.length,1);
mode='orbit';const before=calls.orbit.length;send('pointerdown');send('pointermove',30,30);send('pointerup',30,30);assert.ok(calls.orbit.length>before);
mode='pan';send('pointerdown',0,0,1);send('pointerdown',100,0,2);send('pointermove',200,0,2);assert.ok(calls.zoom.at(-1)[0]<0,'Spreading fingers zooms in');send('pointermove',0,200,2);assert.ok(Math.abs(calls.orbit.at(-1)[0])>1);send('pointerup',0,0,1);send('pointerup',0,200,2);assert.equal(calls.tap.length,1,'Two-finger gestures never trigger walking');
send('pointerdown');send('pointercancel');send('pointerup');assert.equal(calls.tap.length,1);assert.ok(send('contextmenu').defaultPrevented);
cleanup();send('pointerdown');send('pointerup');assert.equal(calls.tap.length,1);assert.equal(send('contextmenu').defaultPrevented,false);
console.log('PASS: camera-relative movement at every angle, bounded tilt, drag/tap separation, right-drag and touch rotation, pinch zoom, cancellation, and cleanup.');
