import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium, browserOptions } from './helpers/browser.mjs';
const bundle = await build({
  stdin: {
    contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import ActivityDock from './app/game/ActivityDock';import TownChatButton from './app/game/TownChatButton';import JobDock from './app/game/JobDock';import TownHeader from './app/game/TownHeader';function Test(){const [open,setOpen]=useState(false),[unread,setUnread]=useState(12);const chat=<TownChatButton unread={unread} open={open} onClick={()=>{setOpen(v=>!v);setUnread(0)}}/>;return <main className="game"><TownHeader data={null} active={false} onElection={()=>{}} onTown={()=>{}} onSettings={()=>{}}/>{location.hash?<JobDock chat={chat} resident={{job:'paper',shift:location.hash==='#sweep'?'sweep':'paper',mowing:location.hash==='#mow',items:[],papers:12}} busy={false} patches={2} coins={3} completed={1} waterProgress={0} onAction={()=>{}} canAction onFindNext={()=>{}} onVisitStation={()=>{}} onFinish={()=>{}}/>:<ActivityDock selected={null} unread={unread} chatOpen={open} onSelect={()=>{}} onChat={()=>{setOpen(v=>!v);setUnread(0)}}/>}<div className="map-hud"/>{!open&&<div className="mobile-controls"><div className="joystick"/></div>}{open&&<section id="town-chat" className="hud town-chat paper"><div className="chat-messages">Town conversation</div><input aria-label="Message"/></section>}</main>}createRoot(document.getElementById('root')).render(<Test/>);`,
    loader: 'tsx',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'iife',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const css = (await readFile('app/globals.css', 'utf8'))
  .split('\n')
  .slice(5)
  .join('\n');
const server = createServer((req, res) =>
  res.end(
    `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>${css}</style><div id="root"></div><script>${bundle.outputFiles[0].text}</script>`,
  ),
);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ ...browserOptions });
try {
  const page = await browser.newPage();
  for (const size of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ])
    for (const job of ['', '#paper', '#mow', '#sweep']) {
      await page.setViewportSize(size);
      await page.goto(
        `http://127.0.0.1:${server.address().port}/${job ? job.slice(1) : 'idle'}${job}`,
      );
      const button = page.locator('.chat-dock-button');
      await button.waitFor();
      const b = await button.boundingBox(),
        dock = await page.locator('.bottom-dock').boundingBox();
      assert.equal(
        await button.getAttribute('aria-label'),
        'Chat, 12 unread messages',
      );
      assert.equal(await page.locator('.town-chat-unread').innerText(), '12');
      assert.equal(await page.locator('.town-chat-anchor').count(), 0);
      assert.ok(
        b.y >= dock.y && b.y + b.height <= dock.y + dock.height,
        'Chat lives inside the dock',
      );
      assert.ok(
        await page
          .locator('.bottom-dock')
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
        'All dock controls fit',
      );
      if (!job)
        assert.deepEqual(
          await page.locator('.bottom-dock button').allTextContents(),
          ['Home', 'Work', 'Journal', 'Chat12', 'Town'],
        );
      const joystick = page.locator('.mobile-controls');
      if (await joystick.isVisible()) {
        const j = await joystick.boundingBox();
        assert.ok(j.y + j.height <= dock.y, 'Joystick clears the dock');
      }
      await button.click();
      assert.equal(await button.getAttribute('aria-expanded'), 'true');
      assert.equal(
        await page.locator('.town-chat-unread').count(),
        0,
        'Badge clears when unread count becomes zero',
      );
      const panel = await page.locator('#town-chat').boundingBox();
      assert.ok(panel.x >= 0 && panel.x + panel.width <= size.width);
      assert.ok(
        panel.y >= 0 && panel.y + panel.height <= b.y,
        'Conversation appears above its button',
      );
      await button.click();
      assert.equal(await page.locator('#town-chat').count(), 0);
    }
  console.log(
    'PASS: five dock tabs, integrated Chat and unread badge, badge clearing, open/close, and no dock/joystick overlap across phone, landscape, desktop and paper/mowing/sweeping shifts.',
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
