import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium, browserOptions } from './helpers/browser.mjs';
const bundle = await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import TownPanel from './app/game/TownPanel';import {EMPTY_PLANNING} from './app/game/charters';
const root=createRoot(document.getElementById('root'));let key=0;window.calls=[];const call=(type,...args)=>window.calls.push({type,args});
window.data={town:{name:'Willowbrook',residents:2,treasury:9000,prosperity:42,project:0,key:'LOCAL-TOWN'},resident:{id:'mayor',coins:100,home:0,job:'mow'},election:{mayor:{id:'mayor',name:'Alder'}},planning:structuredClone(EMPTY_PLANNING),civic:{tax:1,term:'2026-09',featured:'park-stage',projects:[],history:[]},events:[]};
window.props={data:window.data,busy:false,canMove:true,inviteFallback:'',onOpen:(...a)=>call('open',...a),onChat:()=>call('chat'),onCopyInvite:(...a)=>call('copy',...a),onAction:(...a)=>call('action',...a),onLook:(...a)=>call('look',...a),onWalk:(...a)=>call('walk',...a)};
window.update=(patch={},reset=false)=>{Object.assign(window.props,patch);if(reset)key++;flushSync(()=>root.render(<TownPanel key={key} {...window.props}/>))};window.update();`,
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
    `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}\nbody{margin:0;padding:12px;background:#fffbed}#root{max-width:860px;margin:auto}</style><div id="root"></div><script>${bundle.outputFiles[0].text}</script>`,
  ),
);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch(browserOptions);
  const page = await browser.newPage({
      viewport: { width: 1000, height: 800 },
    }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const tab = (name) => page.getByRole('tab', { name, exact: true }),
    last = () => page.evaluate(() => window.calls.at(-1));
  await tab('Overview').waitFor();
  assert.equal(await tab('Overview').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('.town-initiatives').isVisible(), false);
  await page.getByRole('button', { name: /Shape the next chapter/ }).click();
  assert.equal((await last()).args[0], 'planning');
  await tab('Projects').click();
  await page.locator('.town-initiatives').waitFor({ state: 'visible' });
  assert.equal(
    await page.getByText('Work taxes · Balanced', { exact: true }).isVisible(),
    false,
  );
  await page
    .getByRole('button', { name: 'Contribute 25 coins', exact: true })
    .click();
  assert.equal((await last()).args[0], 'donate');
  await page
    .getByRole('button', { name: 'Fund 100 coins', exact: true })
    .click();
  assert.equal((await last()).args[0], 'fund-project');
  assert.equal((await last()).args[1].term, '2026-09');
  await tab('Town Hall').click();
  assert.equal(await page.locator('.town-initiatives').isVisible(), false);
  await page
    .getByRole('button', { name: 'Contribute 25 coins', exact: true })
    .click();
  assert.equal((await last()).args[0], 'support-project');
  await page.getByText('Work taxes · Balanced', { exact: true }).click();
  await page.getByRole('button', { name: 'Apply tax policy' }).waitFor();
  await page
    .getByRole('button', { name: 'Mayoral election', exact: true })
    .click();
  assert.equal((await last()).args[0], 'election');
  await tab('Neighbors').click();
  assert.equal(
    await page.getByLabel('Your town code').inputValue(),
    'LOCAL-TOWN',
  );
  await page
    .getByRole('button', { name: 'Copy town code', exact: true })
    .click();
  assert.equal((await last()).type, 'copy');
  await page
    .getByRole('button', { name: 'Copy invite link', exact: true })
    .click();
  assert.equal((await last()).args[0], true);
  await page
    .getByRole('button', { name: 'Open town & profession chat', exact: true })
    .click();
  assert.equal((await last()).type, 'chat');
  await page
    .getByRole('button', {
      name: 'Town life · farm, picnic & friends',
      exact: true,
    })
    .click();
  assert.equal((await last()).args[0], 'life');
  await page
    .getByRole('button', { name: 'Move to another town', exact: true })
    .click();
  assert.equal((await last()).args[0], 'move-town');
  await tab('Places').click();
  await page.locator('.town-menu-directory').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Town Library', exact: true }).click();
  assert.equal((await last()).type, 'walk');
  assert.equal((await last()).args[2], 'Town Library');
  await page
    .getByRole('button', {
      name: 'Paws & Porches · pets for your home',
      exact: true,
    })
    .click();
  assert.equal((await last()).args[0], 'pets');
  await page.setViewportSize({ width: 360, height: 740 });
  await tab('Overview').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  assert.equal(await tab('Projects').getAttribute('aria-selected'), 'true');
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.evaluate(() =>
    window.update(
      {
        initialTab: 'projects',
        data: {
          ...window.data,
          election: { mayor: { id: 'another', name: 'Birch' } },
        },
      },
      true,
    ),
  );
  assert.equal(await tab('Projects').getAttribute('aria-selected'), 'true');
  assert.equal(
    await page
      .getByRole('button', { name: 'Fund 100 coins', exact: true })
      .count(),
    0,
  );
  await tab('Town Hall').click();
  await page.getByText('Work taxes · Balanced', { exact: true }).click();
  assert.equal(
    await page.getByRole('button', { name: 'Apply tax policy' }).count(),
    0,
  );
  await tab('Neighbors').click();
  await page.evaluate(() => window.update({ busy: true }));
  assert.ok(
    await page
      .getByRole('button', { name: 'Copy town code', exact: true })
      .isDisabled(),
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: Town tabs, separated project/governance controls, contribution callbacks, invitations, chat, destinations, resident permissions, project deep links, and mobile keyboard navigation.',
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
