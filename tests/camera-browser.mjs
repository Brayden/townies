import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';

// Exercise the real scene locally; no account, live server, or saved town.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'/Users/brayden/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const directory='outputs/camera-qa';await mkdir(directory,{recursive:true});
await build({stdin:{contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import TownScene from './app/game/TownScene';import {EMPTY_PLANNING} from './app/game/charters';import {HOUSES} from './app/game/lifestyle';
const root=createRoot(document.getElementById('root'));window.readyCount=0;window.houses=HOUSES;
window.props={enabled:true,player:{id:'local-camera-test',name:'Local player',color:'#688aa1',x:0,z:6},planning:structuredClone(EMPTY_PLANNING),properties:[{home:0,house:HOUSES[0].id,name:'A',items:[]},{home:1,house:HOUSES[0].id,name:'B',items:[]}]};
window.update=(patch={})=>{Object.assign(window.props,patch);flushSync(()=>root.render(<main className="game"><TownScene {...window.props} onReady={api=>{window.scene=api;window.readyCount++}}/></main>))};window.update();`,resolveDir:process.cwd(),loader:'tsx'},outfile:directory+'/scene.js',bundle:true,format:'iife',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'test-only-camera-observation',setup(b){b.onLoad({filter:/\/TownScene\.tsx$/},async args=>{
 const source=await readFile(args.path,'utf8');
 return {loader:'tsx',contents:source.replace('frame=requestAnimationFrame(animate);\nreturn()=>',`window.inspectCamera=()=>({viewHeight,yaw,pitch,target:target.toArray(),cameraTarget:cameraTarget.toArray(),follow,inspecting,currentFocus,position:you.position.toArray(),keys:[...keys]});\nframe=requestAnimationFrame(animate);\nreturn()=>`)};
})}}]});
const css=(await readFile('app/globals.css','utf8')).split('\n').slice(5).join('\n');
const server=createServer(async(req,res)=>{res.setHeader('Content-Type',req.url==='/scene.js'?'application/javascript':'text/html');res.end(req.url==='/scene.js'?await readFile(directory+'/scene.js'):`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><div id="root"></div><script src="/scene.js"></script>`)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1000,height:750}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.inspectCamera&&window.readyCount===1);
 const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.evaluate(()=>{window.scene.orbit(.7,.1);window.scene.zoom(15)});await frames();
 // A real drag must hold its view through authoritative position updates.
 await page.mouse.move(510,370);await page.mouse.down();await page.mouse.move(650,430,{steps:8});await page.mouse.up();await frames();
 const panned=await page.evaluate(()=>window.inspectCamera());assert.equal(panned.follow,false);assert.equal(panned.inspecting,true);
 await page.evaluate(()=>window.scene.setPosition(0,15));await frames();
 assert.deepEqual(await page.evaluate(()=>window.inspectCamera().cameraTarget),panned.cameraTarget);
 assert.equal(await page.evaluate(()=>window.inspectCamera().follow),false);
 console.log('PASS: dragging the map stays independent of server position corrections.');

 await page.evaluate(()=>window.update({planning:{...window.props.planning,institutions:[...window.props.planning.institutions].reverse(),farmFunded:10},properties:[...window.props.properties].reverse().map(p=>({...p,name:p.name+' renamed'}))}));await frames();
 assert.equal(await page.evaluate(()=>window.readyCount),1);
 console.log('PASS: reordered snapshot rows, names, and funding do not rebuild the scene.');

 const {before,after}=await page.evaluate(()=>{const before=window.inspectCamera();window.update({properties:window.props.properties.map((p,i)=>i===0?{...p,house:window.houses[2].id}:p)});return {before,after:window.inspectCamera()}});
 await page.waitForFunction(()=>window.readyCount===2);await frames();
 for(const key of ['yaw','pitch','viewHeight','follow','inspecting','cameraTarget','position'])assert.deepEqual(after[key],before[key],key);
 assert.deepEqual(after.target,before.target);
 console.log('PASS: a house upgrade rebuilds scenery while preserving camera pose, zoom, mode and local player position.');

 await page.evaluate(()=>window.update({focus:[20,20]}));await frames();
 await page.evaluate(()=>window.scene.center());await frames();assert.equal(await page.evaluate(()=>window.inspectCamera().follow),true);
 await page.evaluate(()=>window.update());await frames();assert.equal(await page.evaluate(()=>window.inspectCamera().follow),true);
 await page.evaluate(()=>window.update({focus:[20,20]}));await frames();assert.equal(await page.evaluate(()=>window.inspectCamera().follow),false);
 await page.evaluate(()=>window.scene.center());await frames();assert.equal(await page.evaluate(()=>window.inspectCamera().follow),true);
 await page.evaluate(()=>window.update({focus:null}));await frames();await page.evaluate(()=>window.update({focus:[20,20]}));await frames();
 assert.equal(await page.evaluate(()=>window.inspectCamera().follow),false);
 await page.evaluate(()=>window.scene.resetCamera());await frames();
 const reset=await page.evaluate(()=>window.inspectCamera());assert.equal(reset.follow,true);assert.equal(reset.yaw,.1);assert.equal(reset.pitch,.9);assert.equal(reset.viewHeight,35);
 console.log('PASS: center/reset consume the old house focus; a newly selected address still focuses correctly.');

 await page.evaluate(()=>window.update({focus:null}));await frames();await page.keyboard.down('s');await frames();
 const moving=await page.evaluate(()=>window.inspectCamera());assert.equal(moving.cameraTarget[1],0);
 await page.evaluate(()=>window.update({properties:window.props.properties.map((p,i)=>i===0?{...p,house:window.houses[3].id}:p)}));
 await page.waitForFunction(()=>window.readyCount===3);await frames();const rebuilt=await page.evaluate(()=>window.inspectCamera());assert.ok(rebuilt.keys.includes('s'));assert.equal(rebuilt.cameraTarget[1],0);assert.ok(rebuilt.position[2]>=moving.position[2]);
 await page.keyboard.up('s');
 console.log('PASS: walking bounce does not move the camera vertically, and held movement survives a scenery change.');

 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{window.scene.lookAt(25,30);window.scene.zoom(5)});await frames();
 const mobile=await page.evaluate(()=>window.inspectCamera());await page.evaluate(()=>window.scene.setPosition(0,10));await frames();
 assert.deepEqual(await page.evaluate(()=>window.inspectCamera().cameraTarget),mobile.cameraTarget);
 await page.screenshot({path:directory+'/camera-mobile.png'});assert.deepEqual(errors,[]);
 console.log('PASS: mobile inspection stays in place during movement corrections; no browser errors.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
