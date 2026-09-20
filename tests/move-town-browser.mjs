import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium, browserOptions } from './helpers/browser.mjs';
const bundle = await build({
  stdin: {
    contents: `import React,{StrictMode} from 'react';import {createRoot} from 'react-dom/client';import MoveTownPanel from './app/game/MoveTownPanel';
    window.calls=[];window.moves=[];window.fail=false;window.empty=false;window.full=false;
    const town={id:'next',name:'Maple Harbor',private:0,created:Date.now()-40*86400000,residents:18,online:3,active72h:12,project:40,farm_funded:1200};
    async function request(action,args){window.calls.push({action,...args});await new Promise(r=>setTimeout(r,30));if(window.fail)throw Error('Offline');if(args.mode==='public')return {towns:window.empty?[]:args.cursor?[{...town,id:'last',name:'Clover Bay'}]:[town,{...town,id:'full',name:'Full Town',residents:50}],nextCursor:window.empty||args.cursor?null:{id:'full',created:town.created}};if(window.full)return {error:'That town has 50 residents.'};return {destination:{...town,name:args.key?'Secret Cove':town.name},homes:[{id:4,name:'5 Meadow Lane'},{id:7,name:'8 Meadow Lane'}]}}
    createRoot(document.getElementById('root')).render(<StrictMode><section style={{maxWidth:520,margin:'auto',padding:16}}><MoveTownPanel data={{town:{id:'home',name:'Willowbrook'},resident:{townJoinedAt:123}}} busy={false} onRequest={request} onMove={async args=>{window.moves.push(args);return false}}/></section></StrictMode>);`,
    loader: 'tsx',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'iife',
  define: { 'process.env.NODE_ENV': '"development"' },
});
const css = (await readFile('app/globals.css', 'utf8'))
  .split('\n')
  .slice(5)
  .join('\n');
const server = createServer((req, res) =>
  res.end(
    `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><div id="root"></div><script>${bundle.outputFiles[0].text}</script>`,
  ),
);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const maple = page.getByRole('button', { name: /Maple Harbor/ });
    await maple.waitFor();
    assert.match(await maple.innerText(), /12 active in past 72 hours/);
    assert.match(await maple.innerText(), /3 online now/);
    assert.match(await maple.innerText(), /Town age: 40 days/);
    assert.match(await maple.innerText(), /18\/50 residents/);
    assert.match(await maple.innerText(), /32 spots open/);
    assert.equal(
      await page.evaluate(() => window.calls.length),
      1,
      'StrictMode does not double-fetch',
    );
    if (width === 320)
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    assert.equal(
      await page.getByRole('button', { name: /Full Town/ }).isDisabled(),
      true,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      'No horizontal overflow',
    );
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: /Clover Bay/ }).waitFor();
    assert.ok((await page.locator('.move-town-option').count()) <= 4);
    while (!(await maple.count()))
      await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await maple.click();
    await page.getByText('Choose your new address').waitFor();
    await page.getByText('8 Meadow Lane', { exact: true }).click();
    assert.equal(
      await page
        .getByRole('radio', { name: '8 Meadow Lane' })
        .getAttribute('aria-checked'),
      'true',
    );
    await page.getByRole('button', { name: 'Review my move' }).click();
    await page
      .getByRole('button', { name: 'Move to Maple Harbor · free' })
      .click();
    await page
      .getByRole('button', { name: 'Refresh towns', exact: true })
      .waitFor();
    const move = await page.evaluate(() => window.moves[0]);
    assert.deepEqual(move, {
      destination: 'next',
      key: '',
      home: 7,
      fromTown: 'home',
      membership: 123,
    });
    await page
      .getByRole('button', { name: 'Invite code', exact: true })
      .click();
    await page.getByLabel('A friend’s town code').fill(' secret ');
    await page.getByRole('button', { name: 'Find town', exact: true }).click();
    await page.getByRole('heading', { name: 'Secret Cove' }).waitFor();
    assert.equal(await page.evaluate(() => window.calls.at(-1).key), 'SECRET');
    await page.getByRole('button', { name: 'Back to towns' }).click();
    await page
      .getByRole('button', { name: 'Public towns', exact: true })
      .click();
    await maple.waitFor();
    await page.evaluate(() => (window.full = true));
    await maple.click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(), /50 residents/);
    await page.evaluate(() => (window.fail = true));
    await page
      .getByRole('button', { name: 'Refresh towns', exact: true })
      .click();
    await page.getByText('Could not load towns. Please try again.').waitFor();
    await page.evaluate(() => {
      window.fail = false;
      window.empty = true;
    });
    await page
      .getByRole('button', { name: 'Refresh towns', exact: true })
      .click();
    await page.getByText(/No other public towns are available yet/).waitFor();
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: desktop/mobile town metrics, automatic loading, pagination, full towns, address review, invitation codes, errors, empty state, and move payload.',
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
