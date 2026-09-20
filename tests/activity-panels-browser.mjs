import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium, browserOptions } from './helpers/browser.mjs';
const bundle = await build({
  stdin: {
    contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import ActivityDock from './app/game/ActivityDock';import ActivityPanel from './app/game/ActivityPanel';import TownPanel from './app/game/TownPanel';import {EMPTY_PLANNING} from './app/game/charters';import {Dialog,DialogContent,DialogTitle,DialogDescription} from './components/ui/dialog';
window.actions=[];window.visits=[];window.starts=[];
const data={town:{id:'test',name:'Willowbrook',private:false,key:'INVITE',residents:12,treasury:350,project:40,prosperity:65},resident:{id:'me',name:'Robin',job:'mow',home:0,house:'meadow-1',coins:150,xp:125,education:8,lastStudy:null,items:['bike','hat-top','flowers','watering-can'],color:'#6988ab',outfit:'outfit-blue',hat:'hat-straw',accessory:'accessory-none',homeAccess:'friends',mowing:false,shift:null},planning:EMPTY_PLANNING,civic:{tax:1,featured:null,term:'test',projects:[],history:[]},election:{mayor:null},peers:[],worldWork:[],lawnCuts:[],grassHistory:[],events:[{name:'Sam',text:'mowed a lawn'}]};
function Test(){const [view,setView]=useState('home');const action=(name,args)=>window.actions.push({name,args});return <main className="game">{['home','work','journal'].includes(view)&&<ActivityPanel key={view} view={view} data={data} busy={false} startDisabled={false} online tier={2} onClose={()=>setView(null)} onEnter={()=>window.visits.push('home')} onHome={()=>window.visits.push('home')} onHousing={()=>window.visits.push('housing')} onSchool={()=>window.visits.push('school')} onStart={id=>window.starts.push(id??'mow')} onAction={action}/>}<ActivityDock selected={view} unread={5} chatOpen={false} onSelect={setView} onChat={()=>setView(null)}/><Dialog open={view==='town'} onOpenChange={v=>{if(!v)setView(null)}}><DialogContent className="modal game-menu-frame"><DialogTitle>Willowbrook</DialogTitle><DialogDescription className="sr-only">Shared town progress</DialogDescription><TownPanel data={data} busy={false} places={[{id:'general',name:'General Store'},...Array.from({length:8},(_,i)=>({id:'place'+i,name:'Place '+i}))]} inviteFallback="" onCopy={link=>window.actions.push({name:'copy',link})} onVisit={id=>window.visits.push(id)} onMove={()=>window.visits.push('move')} onElection={()=>window.visits.push('election')} onPlanning={()=>window.visits.push('planning')} onLife={()=>window.visits.push('life')} onFriends={()=>window.visits.push('friends')} onAction={action} onLook={()=>{}} onWalk={()=>{}}/></DialogContent></Dialog></main>}createRoot(document.getElementById('root')).render(<Test/>);`,
    loader: 'tsx',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'iife',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const cssFiles = (await readdir('dist/client', { recursive: true })).filter(
  (f) => f.endsWith('.css'),
);
assert.ok(cssFiles.length, 'Run npm run build first.');
const css = (
  await Promise.all(cssFiles.map((f) => readFile('dist/client/' + f, 'utf8')))
).join('\n');
const server = createServer((req, res) =>
  res.end(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script>${bundle.outputFiles[0].text}</script>`,
  ),
);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('heading', { name: 'My home', exact: true }).waitFor();
    const panel = page.locator('.activity-panel'),
      dock = page.locator('.bottom-dock');
    const b = await panel.boundingBox(),
      d = await dock.boundingBox();
    assert.ok(
      b.x >= 0 &&
        b.x + b.width <= size.width &&
        b.y >= 0 &&
        b.y + b.height <= d.y,
      'Panel fits above dock',
    );
    assert.ok(
      await panel.evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      'Outer panel does not scroll',
    );
    assert.equal(
      await page
        .getByRole('button', { name: /buy|shop|browse the market/i })
        .count(),
      0,
    );
    await page.getByRole('tab', { name: 'Belongings', exact: true }).click();
    await page.getByRole('button', { name: 'Ride', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.actions.at(-1)), {
      name: 'bike',
      args: { active: true },
    });
    assert.equal(
      await page.getByText('Garden bench', { exact: true }).count(),
      0,
      'Unowned gear is not listed',
    );
    await page.getByRole('tab', { name: 'Outfits', exact: true }).click();
    assert.equal(
      await page.getByText('Midnight tailored suit', { exact: true }).count(),
      0,
      'Unowned paid outfit is absent',
    );
    await page
      .getByRole('button', { name: 'Next outfits', exact: true })
      .click();
    await page.getByRole('button', { name: /Midnight top hat/ }).click();
    assert.deepEqual(await page.evaluate(() => window.actions.at(-1)), {
      name: 'wardrobe',
      args: { item: 'hat-top' },
    });
    await page.getByRole('button', { name: 'Work', exact: true }).click();
    await page
      .getByRole('button', { name: 'Start my job', exact: true })
      .click();
    assert.deepEqual(await page.evaluate(() => window.starts), ['mow']);
    await page.getByRole('tab', { name: 'Pitch in', exact: true }).click();
    assert.equal(await page.locator('.job-slot').count(), 4);
    await page.getByRole('button', { name: 'Next jobs' }).click();
    assert.equal(await page.locator('.job-slot').count(), 4);
    await page.getByRole('tab', { name: 'Career', exact: true }).click();
    await page
      .getByLabel('Change profession', { exact: true })
      .selectOption('paper');
    await page
      .getByRole('button', { name: 'Change my job', exact: true })
      .click();
    assert.deepEqual(await page.evaluate(() => window.actions.at(-1)), {
      name: 'job',
      args: { job: 'paper' },
    });
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    await page
      .getByRole('heading', { name: 'My journal', exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole('progressbar', { name: 'Town prosperity' }).count(),
      0,
    );
    await page
      .getByRole('progressbar', { name: 'Education progress' })
      .waitFor();
    await page
      .getByRole('button', { name: 'Walk to school', exact: true })
      .click();
    assert.equal(await page.evaluate(() => window.visits.at(-1)), 'school');
    await page.getByRole('button', { name: 'Town', exact: true }).click();
    await page
      .getByRole('progressbar', { name: 'Town prosperity', exact: true })
      .waitFor();
    await page.getByRole('tab', { name: 'Projects', exact: true }).click();
    await page
      .getByRole('button', { name: 'Contribute 25 coins', exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole('heading', { name: 'Open the Town Farm', exact: true })
        .count(),
      0,
    );
    await page.getByRole('button', { name: 'Farm', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Open the Town Farm', exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole('heading', {
          name: 'A brighter community park',
          exact: true,
        })
        .count(),
      0,
    );
    await page.getByRole('tab', { name: 'Places', exact: true }).click();
    await page.getByRole('button', { name: /General Store/ }).click();
    assert.equal(await page.evaluate(() => window.visits.at(-1)), 'general');
    assert.equal(await page.locator('.place-slot').count(), 6);
    await page
      .getByRole('button', { name: 'Next places', exact: true })
      .click();
    assert.equal(await page.locator('.place-slot').count(), 3);
    await page.getByRole('tab', { name: 'Community', exact: true }).click();
    await page
      .getByRole('button', { name: 'Invite & move', exact: true })
      .click();
    await page.getByRole('button', { name: 'Copy code', exact: true }).click();
    assert.equal(await page.evaluate(() => window.actions.at(-1).name), 'copy');
    assert.ok(
      await page
        .getByRole('dialog')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
      'Town menu has no horizontal overflow',
    );
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: owned-only gear/outfits, career actions, paged jobs and places, personal Journal, Town prosperity, focused projects, invitations, and responsive side panels.',
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
