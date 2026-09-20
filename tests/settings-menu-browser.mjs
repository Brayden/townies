import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium, browserOptions } from './helpers/browser.mjs';
const bundle = await build({
  stdin: {
    contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import SettingsPanel from './app/game/SettingsPanel';import AccountGate from './app/account/AccountGate';import {Dialog,DialogContent,DialogTitle,DialogDescription} from './components/ui/dialog';
function Fixture(){const [open,setOpen]=useState(false),[preferences,setPreferences]=useState({music:false,effects:true,musicVolume:.5,effectsVolume:.7});return <AccountGate><button onClick={()=>setOpen(true)}>Open Settings</button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="modal settings-modal game-menu-frame"><DialogTitle>Settings</DialogTitle><DialogDescription className="sr-only">Game preferences</DialogDescription><SettingsPanel audio={{preferences,change:v=>setPreferences(p=>({...p,...v})),status:'ready',retry:()=>{}}} data={{town:{id:'home',name:'Willowbrook'},resident:{townJoinedAt:123}}} active busy={false} onMove={async()=>false} onRequest={async(action,args)=>args.mode==='public'?{towns:Array.from({length:12},(_,i)=>({id:'town-'+i,name:i===0?'Maple Harbor':'Town '+i,created:Date.now()-40*86400000,residents:18,online:3,active72h:12,private:0,project:50,farm_funded:0})),nextCursor:null}:{destination:{id:'town-0',name:'Maple Harbor',created:Date.now()-40*86400000,residents:18,online:3,active72h:12,private:0,project:50,farm_funded:0},homes:Array.from({length:20},(_,id)=>({id,name:(id+1)+' Meadow Lane'}))}}/></DialogContent></Dialog></AccountGate>}createRoot(document.getElementById('root')).render(<Fixture/>);`,
    loader: 'tsx',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'iife',
  define: { 'process.env.NODE_ENV': '"production"' },
});
// Exercise the shipped CSS, including Tailwind/Base UI layout, after npm run build.
const cssFiles = (await readdir('dist/client', { recursive: true })).filter(
  (f) => f.endsWith('.css'),
);
assert.ok(cssFiles.length, 'Build the app before running menu browser tests.');
const css = (
  await Promise.all(cssFiles.map((f) => readFile('dist/client/' + f, 'utf8')))
).join('\n');
const server = createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify(
        req.url === '/api/account'
          ? {
              mode: 'account',
              user: {
                id: 'fixture',
                name: 'Test Townie',
                email: 'townie@example.com',
              },
            }
          : [],
      ),
    );
    return;
  }
  res.end(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script>${bundle.outputFiles[0].text}</script>`,
  );
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const size of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page
      .getByRole('button', { name: 'Open Settings', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    const bounds = await dialog.boundingBox();
    assert.ok(
      bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= size.width + 1 &&
        bounds.y + bounds.height <= size.height + 1,
      'Frame fits viewport',
    );
    const frameScroll = await dialog.evaluate(
      (el) => el.scrollHeight - el.clientHeight,
    );
    assert.ok(frameScroll <= 1, 'The menu frame itself does not scroll');
    assert.equal(await page.getByRole('tab').count(), 4);
    assert.equal(
      await page.getByText('Change my job', { exact: true }).count(),
      0,
    );
    const sound = page.getByRole('switch', {
      name: 'Background music',
      exact: true,
    });
    await sound.click();
    assert.equal(await sound.getAttribute('aria-checked'), 'true');
    assert.equal(
      await page
        .getByRole('slider', { name: 'Background music volume', exact: true })
        .isDisabled(),
      false,
    );
    if (size.height > 650)
      assert.ok(
        await page
          .locator('.game-menu-body')
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
        'Sound fits without scrolling',
      );
    await page.getByRole('tab', { name: 'Controls', exact: true }).click();
    await page
      .getByRole('button', { name: 'Touch screen', exact: true })
      .click();
    await page.getByText('Twist with two fingers', { exact: true }).waitFor();
    assert.equal(await sound.count(), 0, 'Inactive sound controls unmount');
    const controls = page.getByRole('tab', { name: 'Controls', exact: true });
    await controls.focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await page
      .getByRole('heading', { name: 'Your account', exact: true })
      .waitFor();
    await page
      .getByRole('button', { name: 'Add a passkey', exact: true })
      .waitFor();
    await page.getByRole('button', { name: 'Log out', exact: true }).waitFor();
    await page.getByRole('tab', { name: 'Towns', exact: true }).click();
    await page.getByRole('button', { name: /Maple Harbor/ }).waitFor();
    if (size.width >= 390 && size.height > 650)
      assert.ok(
        await page
          .locator('.game-menu-body')
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
        `Town grid fits without scrolling at ${size.width}x${size.height}`,
      );
    const cards = page.locator('.move-town-option');
    assert.equal(
      await cards.count(),
      size.width < 360 || size.height <= 650 ? 1 : size.width <= 700 ? 2 : 4,
    );
    if (size.width >= 360 && size.height > 650) {
      const a = await cards.nth(0).boundingBox(),
        b = await cards.nth(1).boundingBox();
      assert.equal(a.y, b.y, 'Cards form a grid');
      assert.ok(b.x > a.x);
    }
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    assert.equal(
      await page.getByRole('button', { name: /Maple Harbor/ }).count(),
      0,
    );
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await page.getByRole('button', { name: /Maple Harbor/ }).click();
    await page
      .getByRole('heading', { name: 'Maple Harbor', exact: true })
      .waitFor();
    assert.equal(await page.getByRole('radio').count(), 6);
    await page.getByRole('button', { name: 'Next addresses' }).click();
    await page.getByText('8 Meadow Lane', { exact: true }).click();
    await page.getByRole('button', { name: 'Review my move' }).click();
    await page.getByText('8 Meadow Lane · free', { exact: true }).waitFor();
    assert.ok(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
      'No horizontal overflow',
    );
    if (size.width === 390) {
      await page.getByRole('tab', { name: 'Controls', exact: true }).click();
      await page.locator('.game-menu-frame').evaluate((el) => {
        for (const text of el.querySelectorAll('h2,h3,p,button,dt,dd'))
          text.style.fontSize =
            parseFloat(getComputedStyle(text).fontSize) * 2 + 'px';
      });
      await page
        .getByRole('button', { name: 'Touch screen', exact: true })
        .click();
      assert.ok(
        await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
        'Enlarged text has no horizontal overflow',
      );
      await page
        .getByText('Tap the action button', { exact: true })
        .scrollIntoViewIfNeeded();
    }
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', { name: 'Open Settings', exact: true })
      .waitFor();
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await dialog.count(), 0);
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: Settings tabs, real sound controls, account/passkey discovery, keyboard navigation, dialog dismissal, town grid/pagination, address review, and responsive frame.',
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
