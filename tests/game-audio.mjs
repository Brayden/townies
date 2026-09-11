import assert from 'node:assert/strict';
import {GameAudio,DEFAULT_AUDIO,audioPreferences} from '../app/game/audio.ts';

class Param{
 value=0;
 cancelScheduledValues(){}
 setValueAtTime(v){this.value=v}
 linearRampToValueAtTime(v){this.value=v}
 exponentialRampToValueAtTime(v){this.value=v}
 setTargetAtTime(v){this.value=v}
}
class Node{
 gain=new Param();frequency=new Param();started=false;stopped=false;offset=0;
 connect(){} disconnect(){} setPeriodicWave(){}
 start(_when,offset=0){this.started=true;this.offset=offset}
 stop(){this.stopped=true;this.onended?.()}
}
const contexts=[];
class Context{
 state='suspended';currentTime=0;sampleRate=48000;destination={};nodes=[];
 constructor(){contexts.push(this)}
 createGain(){return new Node()}
 createBufferSource(){const node=new Node();this.nodes.push(node);return node}
 createOscillator(){return this.createBufferSource()}
 createBiquadFilter(){return new Node()}
 createPeriodicWave(){return {}}
 createBuffer(_channels,length){return {getChannelData:()=>new Float32Array(length)}}
 async decodeAudioData(){return {duration:54}}
 async resume(){this.state='running'}
 async suspend(){this.state='suspended'}
 async close(){this.state='closed'}
}
globalThis.AudioContext=Context;
let downloads=0;
globalThis.fetch=async()=>{downloads++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}};
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
const preferences={...DEFAULT_AUDIO,music:true,effects:true};
assert.deepEqual(audioPreferences(null),DEFAULT_AUDIO);
assert.deepEqual(audioPreferences({music:'true',effects:true,musicVolume:100,effectsVolume:NaN}),{...DEFAULT_AUDIO,effects:true,musicVolume:1});

const audio=new GameAudio();
audio.configure(DEFAULT_AUDIO,true,true);audio.unlock();audio.reward();
assert.equal(contexts.length,0,'Opted-out players must not create audio or download music');
audio.configure(preferences,true,true);audio.wake();
assert.equal(contexts.length,0,'Returning to a tab must not unlock a new context');
audio.unlock();audio.unlock();await flush();
assert.equal(downloads,1,'Concurrent gestures share a download');
const ctx=contexts.at(-1);
const music=ctx.nodes.filter(n=>n.loop);
assert.equal(music.length,1,'Only one loop may play');assert.equal(music[0].started,true);
audio.paper('release');audio.paper('impact');audio.paperReward();
assert.equal(ctx.nodes.filter(n=>n.started&&!n.loop).length,3,'Throw, impact, and saved-delivery reward are independent effects');
ctx.currentTime=7;
audio.configure(preferences,true,false);await flush();
assert.equal(ctx.state,'suspended');assert.ok(ctx.nodes.every(n=>n.stopped),'Hiding stops the music and all pending effects');
const count=ctx.nodes.length;audio.reward();audio.paper('release');assert.equal(ctx.nodes.length,count,'No background effects');
audio.configure(preferences,true,true);audio.wake();await flush();
assert.equal(ctx.nodes.at(-1).offset,7,'Returning continues from the paused position');
audio.configure({...preferences,effects:false},true,true);const quietCount=ctx.nodes.length;
audio.reward();audio.paper('impact');assert.equal(ctx.nodes.length,quietCount,'Effects can be muted without stopping music');
audio.configure({...preferences,music:false},true,true);assert.ok(ctx.nodes.filter(n=>n.loop).every(n=>n.stopped));
audio.reward();assert.ok(ctx.nodes.length>quietCount,'Effects work with music disabled');
audio.configure(preferences,false,true);audio.unlock();assert.equal(ctx.state,'suspended','Leaving the game stops audio');
audio.dispose();assert.equal(ctx.state,'closed');

// An in-flight music request must not turn sound back on after mute or teardown.
let resolveFetch;
globalThis.fetch=()=>new Promise(resolve=>{resolveFetch=resolve});
const delayed=new GameAudio();delayed.configure(preferences,true,true);delayed.unlock();await flush();
delayed.configure({...preferences,music:false},true,true);
resolveFetch({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await flush();
assert.equal(contexts.at(-1).nodes.filter(n=>n.loop).length,0);
delayed.configure(preferences,true,true);await flush();assert.equal(contexts.at(-1).nodes.filter(n=>n.loop).length,1,'Re-enabling reuses the decoded track');delayed.dispose();
const disposed=new GameAudio();disposed.configure(preferences,true,true);disposed.unlock();await flush();disposed.dispose();
resolveFetch({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await flush();assert.equal(contexts.at(-1).nodes.length,0,'Late downloads must not play after unmount');

let attempts=0;const statuses=[];
globalThis.fetch=async()=>{attempts++;return {ok:attempts>1,arrayBuffer:async()=>new ArrayBuffer(1)}};
const failing=new GameAudio(s=>statuses.push(s));failing.configure(preferences,true,true);failing.unlock();await flush();
assert.equal(statuses.at(-1),'error');failing.unlock();await flush();assert.equal(attempts,1,'A failed request must not retry on every movement');
failing.retry();await flush();assert.equal(attempts,2);assert.equal(statuses.at(-1),'playing');failing.dispose();
console.log('PASS: opt-in playback, lazy loading, independent channels, pause/resume, delivery effects, mute/download races, cleanup, and recoverable loading errors.');
