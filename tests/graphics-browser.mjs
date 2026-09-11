import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';

// Local, isolated renderer QA. Does not log in, connect to a town, or change saves.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'/Users/brayden/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const directory='outputs/graphics-qa';await mkdir(directory,{recursive:true});
await build({stdin:{contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import TownScene from './app/game/TownScene';
const root=createRoot(document.getElementById('root'));let key=0;window.readyCount=0;window.unavailableCount=0;
window.mount=()=>flushSync(()=>root.render(<main className="game"><TownScene key={key++} enabled onReady={api=>{window.scene=api;window.readyCount++}} onUnavailable={()=>window.unavailableCount++}/></main>));
window.unmount=()=>flushSync(()=>root.render(null));window.mount();`,resolveDir:process.cwd(),loader:'tsx'},outfile:directory+'/scene.js',bundle:true,format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
const css=(await readFile('app/globals.css','utf8')).split('\n').slice(5).join('\n');
const server=createServer(async(req,res)=>{res.setHeader('Content-Type',req.url==='/scene.js'?'application/javascript':'text/html');res.end(req.url==='/scene.js'?await readFile(directory+'/scene.js'):`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><div id="root"></div><script src="/scene.js"></script>`)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:900,height:700}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const original=HTMLCanvasElement.prototype.getContext;window.contexts=[];window.graphicsFailure='high';
  HTMLCanvasElement.prototype.getContext=function(type,options){
   if(type==='webgl2'&&(window.graphicsFailure==='all'||window.graphicsFailure==='high'&&options?.powerPreference==='high-performance'))return null;
   const context=original.apply(this,arguments);
   if(type==='webgl2'&&context&&!window.contexts.includes(context))window.contexts.push(context);
   return context;
  };
 });
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.waitForFunction(()=>window.readyCount===1);
 assert.equal(await page.locator('[role=alert]').count(),0);
 assert.equal(await page.evaluate(()=>document.querySelector('canvas').getContext('webgl2').getContextAttributes().antialias),false);
 console.log('PASS: a rejected high-performance context falls back to a working lightweight view.');

 await page.evaluate(()=>{window.graphicsFailure='';window.ext=document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context');window.ext.loseContext()});
 await page.getByText('The 3D view was interrupted',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.unavailableCount),1);
 await page.evaluate(()=>window.ext.restoreContext());
 await page.waitForFunction(()=>window.readyCount===2&&!document.querySelector('[role=alert]'));
 console.log('PASS: context loss reports the interruption, then restoration clears the error and reconnects the scene.');

 for(let i=0;i<5;i++){
  const count=await page.evaluate(()=>window.readyCount);await page.evaluate(()=>window.mount());
  await page.waitForFunction(n=>window.readyCount>n,count);
  await page.waitForFunction(()=>window.contexts.slice(0,-1).every(ctx=>ctx.isContextLost()));
 }
 assert.equal(await page.evaluate(()=>window.contexts.filter(ctx=>!ctx.isContextLost()).length),1);
 console.log('PASS: repeated scene changes release every old graphics context.');

 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{window.graphicsFailure='all';window.mount()});
 await page.getByRole('button',{name:'Retry 3D view',exact:true}).waitFor();
 const box=await page.locator('[role=alert]').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390&&box.y>=0&&box.y+box.height<=844);
 await page.screenshot({path:directory+'/recovery-mobile.png'});
 const before=await page.evaluate(()=>window.readyCount);await page.evaluate(()=>window.graphicsFailure='');
 await page.getByRole('button',{name:'Retry 3D view',exact:true}).click();
 await page.waitForFunction(n=>window.readyCount>n&&!document.querySelector('[role=alert]'),before);
 assert.equal(await page.evaluate(()=>document.querySelector('canvas').getContext('webgl2').getContextAttributes().antialias),false);
 await page.evaluate(()=>window.unmount());
 await page.waitForFunction(()=>window.contexts.every(ctx=>ctx.isContextLost()));
 assert.deepEqual(errors,[]);
 console.log('PASS: total startup failure is recoverable on mobile; retry clears stale errors, and unmount leaves no live context.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
