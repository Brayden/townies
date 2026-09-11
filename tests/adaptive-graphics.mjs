import assert from 'node:assert/strict';
import {AdaptiveGraphics} from '../app/game/adaptiveGraphics.ts';
function run(policy,from,to,frame,active=true){const changes=[];let now=from;while(now<to){now+=frame;const changed=policy.sample(now,active);if(changed!==null)changes.push({at:now,level:changed})}return {now,changes}}
let policy=new AdaptiveGraphics();
assert.equal(policy.level,0);
run(policy,0,7000,100);assert.equal(policy.level,0,'Loading warm-up must not reduce quality');
let r=run(policy,7000,15000,40);assert.equal(policy.level,1,'Sustained 25 FPS drops shadows first');assert.equal(r.changes.length,1);
r=run(policy,15000,28000,40);assert.equal(policy.level,2,'Continuing pressure reduces resolution one step at a time');
r=run(policy,28000,70000,40);assert.equal(policy.level,3,'Repeated poor performance reaches the bounded minimum');
r=run(policy,70000,100000,1000/60);assert.equal(policy.level,3,'Do not immediately bounce back to expensive quality');
r=run(policy,100000,250000,1000/60);assert.equal(policy.level,0,'Sustained headroom eventually restores the highest quality');assert.deepEqual(r.changes.map(c=>c.level),[2,1,0]);
policy=new AdaptiveGraphics();run(policy,0,100000,1000/30);assert.equal(policy.level,0,'A stable 30 FPS power-saving cap should retain sharp graphics');
policy=new AdaptiveGraphics();run(policy,0,100000,1000,false);assert.equal(policy.level,0,'Hidden-tab throttling is ignored');run(policy,100000,107000,80);assert.equal(policy.level,0,'Foreground resume gets a warm-up');
policy=new AdaptiveGraphics();run(policy,0,12000,1000/60);policy.sample(12500);run(policy,12500,30000,1000/60);assert.equal(policy.level,0,'An isolated stutter does not downgrade');
policy=new AdaptiveGraphics();policy.recover(100);assert.equal(policy.level,1);run(policy,100,70000,1000/60);assert.equal(policy.level,1,'Context recovery waits before probing high quality');run(policy,70000,110000,1000/60);assert.equal(policy.level,0);
console.log('PASS: high-first defaults, loading/hidden/stutter protection, gradual degradation, bounded floor, delayed quality recovery and context-loss cooldown.');
