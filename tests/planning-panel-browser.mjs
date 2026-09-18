import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium, browserOptions } from './helpers/browser.mjs';
const bundle = await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import PlanningPanel from './app/game/PlanningPanel';import {EMPTY_PLANNING} from './app/game/charters';
const root=createRoot(document.getElementById('root'));let key=0;window.actions=[];
window.data={town:{treasury:9000},resident:{id:'mayor',coins:100,home:0,job:'mow'},election:{mayor:{id:'mayor'}},planning:{...structuredClone(EMPTY_PLANNING),squareVersion:1}};
window.props={data:window.data,busy:false,onAction:(action,args)=>window.actions.push({action,args}),onLook:()=>{},onTravel:()=>{},onPreview:()=>{}};
window.update=(patch={},reset=false)=>{Object.assign(window.props,patch);if(reset)key++;flushSync(()=>root.render(<PlanningPanel key={key} {...window.props}/>))};window.update();`,
    resolveDir: process.cwd(),
    loader: 'tsx',
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
    `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}\nbody{margin:0;padding:12px;background:#fffbed}#root{max-width:1080px;margin:auto}</style><div id="root"></div><script>${bundle.outputFiles[0].text}</script>`,
  ),
);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch(browserOptions);
  const page = await browser.newPage({
      viewport: { width: 1100, height: 800 },
    }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const tab = (name) => page.getByRole('tab', { name, exact: true });
  await tab('Overview').waitFor();
  assert.equal(await tab('Overview').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('.venue-catalog').isVisible(), false);
  await tab('New places').click();
  await page.locator('.venue-catalog').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.venue-choice').count(), 12);
  await page.getByRole('button', { name: /Clover Music Club/ }).click();
  await page
    .getByRole('button', { name: 'Review proposal', exact: true })
    .click();
  await page.getByRole('region', { name: 'Review town proposal' }).waitFor();
  assert.equal(await tab('Overview').getAttribute('aria-selected'), 'true');
  await page.getByRole('button', { name: 'Open resident vote' }).click();
  assert.equal(
    await page.evaluate(() => window.actions.at(-1).args.option),
    'music',
  );
  await page.getByRole('button', { name: 'Cancel draft' }).click();
  await tab('New places').click();
  assert.equal(
    await page
      .getByRole('button', { name: /Clover Music Club/ })
      .getAttribute('aria-pressed'),
    'true',
  );
  await tab('Upgrades').click();
  assert.equal(await page.locator('.institution-card:visible').count(), 1);
  await tab('Harbor').click();
  assert.match(
    await page.locator('.institution-card:visible').textContent(),
    /Harbor House/,
  );
  await page.getByRole('button', { name: 'Propose relocation' }).click();
  await page.getByRole('region', { name: 'Review town proposal' }).waitFor();
  assert.match(
    await page.locator('.planning-review').textContent(),
    /Relocate Harbor/,
  );
  await page.getByRole('button', { name: 'Cancel draft' }).click();
  await tab('More land').click();
  await page.locator('.territory-choice').first().click();
  await page.getByRole('region', { name: 'Review town proposal' }).waitFor();
  assert.equal(await tab('Overview').getAttribute('aria-selected'), 'true');
  await page.evaluate(() =>
    window.update(
      {
        initialDraft: {
          kind: 'build',
          institution: null,
          option: 'browse',
          fromPlot: 'square-southeast-corner',
        },
      },
      true,
    ),
  );
  assert.equal(await tab('New places').getAttribute('aria-selected'), 'true');
  assert.equal(
    await page
      .getByRole('button', { name: /4 · Southeast Corner Lot/ })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.evaluate(() =>
    window.update({
      data: {
        ...window.data,
        planning: {
          ...window.data.planning,
          proposals: [
            {
              id: 'plan',
              kind: 'build',
              option: 'music',
              institution: null,
              fromPlot: 'square-southeast-corner',
              cost: 2100,
              funded: 0,
              status: 'voting',
              name: 'Mayor',
              yes: 0,
              no: 0,
              closes: Date.now() + 86400000,
              quorum: 1,
              electorate: 1,
              eligible: true,
              myVote: null,
            },
          ],
        },
      },
    }),
  );
  await page.getByRole('button', { name: 'Support', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Support', exact: true }).click();
  assert.equal(
    await page.evaluate(() => window.actions.at(-1).action),
    'plan-vote',
  );
  await tab('New places').click();
  await page.locator('.planning-current-link').click();
  await page.getByRole('button', { name: 'Support', exact: true }).waitFor();
  // Narrow screens retain all tab choices and keyboard navigation without overflow.
  await page.setViewportSize({ width: 360, height: 740 });
  const overview = page.getByRole('tab', { name: /^Overview/ });
  await overview.focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(
    await tab('New places').evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press('Enter');
  assert.equal(await tab('New places').getAttribute('aria-selected'), 'true');
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.evaluate(() =>
    window.update(
      {
        data: { ...window.data, election: { mayor: { id: 'someone-else' } } },
        initialDraft: null,
      },
      true,
    ),
  );
  await tab('New places').click();
  assert.ok(
    await page
      .getByRole('button', { name: 'Review proposal', exact: true })
      .isDisabled(),
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: planning tabs, venue/relocation/land draft review, lot deep links, live project updates, voting callbacks, resident permissions, and mobile keyboard navigation.',
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
