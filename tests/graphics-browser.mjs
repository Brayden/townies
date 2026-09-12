import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';

// Local, isolated renderer QA. Does not log in, connect to a town, or change saves.
import { chromium, browserOptions } from './helpers/browser.mjs';
const directory = 'outputs/graphics-qa';
await mkdir(directory, { recursive: true });
await build({
  stdin: {
    contents: `
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import * as graphics from './app/game/townRenderer';import * as THREE from 'three';window.graphicsTest={...graphics,THREE};
import TownScene from './app/game/TownScene';import AccountGate from './app/account/AccountGate';
const root=createRoot(document.getElementById('root'));let key=0;window.readyCount=0;window.unavailableCount=0;
window.account=()=>flushSync(()=>root.render(<AccountGate><p>Signed in</p></AccountGate>));
window.welcome=()=>flushSync(()=>root.render(<main className="game"><TownScene key={key++} enabled={false} onReady={api=>{window.scene=api;window.readyCount++;api.overview()}}/></main>));
window.mount=()=>flushSync(()=>root.render(<main className="game"><TownScene key={key++} enabled onReady={api=>{window.scene=api;window.readyCount++}} onUnavailable={()=>window.unavailableCount++}/></main>));
window.unmount=()=>flushSync(()=>root.render(null));window.mount();`,
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  outfile: directory + '/scene.js',
  bundle: true,
  format: 'iife',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const css = (await readFile('app/globals.css', 'utf8'))
  .split('\n')
  .slice(5)
  .join('\n');
const server = createServer(async (req, res) => {
  res.setHeader(
    'Content-Type',
    req.url === '/scene.js' ? 'application/javascript' : 'text/html',
  );
  res.end(
    req.url === '/scene.js'
      ? await readFile(directory + '/scene.js')
      : `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><div id="root"></div><script src="/scene.js"></script>`,
  );
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({
    ...browserOptions,
    args: ['--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    window.contexts = [];
    window.attempts = [];
    window.graphicsFailure = 'high';
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      if (type === 'webgl2' && options) window.attempts.push(options);
      if (
        type === 'webgl2' &&
        (window.graphicsFailure === 'all' ||
          (window.graphicsFailure === 'high' &&
            options?.powerPreference === 'high-performance'))
      ) {
        this.dispatchEvent(
          new WebGLContextEvent('webglcontextcreationerror', {
            statusMessage: 'Test graphics refusal',
          }),
        );
        return null;
      }
      const context = original.apply(this, arguments);
      if (type === 'webgl2' && context && !window.contexts.includes(context))
        window.contexts.push(context);
      return context;
    };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.readyCount === 1);
  assert.equal(await page.locator('[role=alert]').count(), 0);
  assert.equal(
    await page.evaluate(
      () =>
        document
          .querySelector('canvas')
          .getContext('webgl2')
          .getContextAttributes().antialias,
    ),
    false,
  );
  console.log(
    'PASS: a rejected high-performance context falls back to a working lightweight view.',
  );

  await page.evaluate(() => {
    window.graphicsFailure = '';
    window.ext = document
      .querySelector('canvas')
      .getContext('webgl2')
      .getExtension('WEBGL_lose_context');
    window.ext.loseContext();
  });
  await page
    .getByText('The 3D view was interrupted', { exact: true })
    .waitFor();
  assert.equal(await page.evaluate(() => window.unavailableCount), 1);
  await page.evaluate(() => window.ext.restoreContext());
  await page.waitForFunction(
    () => window.readyCount === 2 && !document.querySelector('[role=alert]'),
  );
  console.log(
    'PASS: context loss reports the interruption, then restoration clears the error and reconnects the scene.',
  );

  for (let i = 0; i < 5; i++) {
    const count = await page.evaluate(() => window.readyCount);
    await page.evaluate(() => window.mount());
    await page.waitForFunction((n) => window.readyCount > n, count);
    await page.waitForFunction(() =>
      window.contexts.slice(0, -1).every((ctx) => ctx.isContextLost()),
    );
  }
  assert.equal(
    await page.evaluate(
      () => window.contexts.filter((ctx) => !ctx.isContextLost()).length,
    ),
    1,
  );
  console.log(
    'PASS: repeated scene changes release every old graphics context.',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    window.graphicsFailure = 'all';
    window.mount();
  });
  await page
    .getByRole('button', { name: 'Retry 3D view', exact: true })
    .waitFor();
  await page.waitForFunction(
    () => document.querySelector('[role=alert] button')?.disabled === false,
  );
  assert.match(
    await page.locator('[role=alert] pre').textContent(),
    /Test graphics refusal/,
  );
  const attempts = await page.evaluate(() => window.attempts.length);
  await page.waitForTimeout(2000);
  assert.equal(
    await page.evaluate(() => window.attempts.length),
    attempts,
    'Permanent failure must not retry forever',
  );
  const box = await page.locator('[role=alert]').boundingBox();
  assert.ok(
    box.x >= 0 &&
      box.x + box.width <= 390 &&
      box.y >= 0 &&
      box.y + box.height <= 844,
  );
  if (process.env.TOWNIES_SCREENSHOTS === '1')
    await page.screenshot({ path: directory + '/recovery-mobile.png' });
  const before = await page.evaluate(() => window.readyCount);
  await page.evaluate(() => (window.graphicsFailure = ''));
  await page
    .getByRole('button', { name: 'Retry 3D view', exact: true })
    .click();
  await page.waitForFunction(
    (n) => window.readyCount > n && !document.querySelector('[role=alert]'),
    before,
  );
  assert.equal(
    await page.evaluate(
      () =>
        document
          .querySelector('canvas')
          .getContext('webgl2')
          .getContextAttributes().antialias,
    ),
    false,
  );

  // A temporarily refused context should recover without pressing Retry.
  await page.evaluate(() => {
    window.graphicsFailure = 'all';
    window.mount();
  });
  await page.getByText('Starting a lighter view…', { exact: true }).waitFor();
  const transient = await page.evaluate(() => window.readyCount);
  await page.evaluate(() => (window.graphicsFailure = ''));
  await page.waitForFunction(
    (n) => window.readyCount > n && !document.querySelector('[role=alert]'),
    transient,
  );
  console.log(
    'PASS: temporary graphics refusal automatically recovers after a delay; permanent refusal has a bounded retry budget.',
  );

  // No native restoration: automatically replace the lost context once.
  const lost = await page.evaluate(() => {
    const n = window.readyCount;
    document
      .querySelector('canvas')
      .getContext('webgl2')
      .getExtension('WEBGL_lose_context')
      .loseContext();
    return n;
  });
  await page.waitForFunction(
    (n) => window.readyCount > n && !document.querySelector('[role=alert]'),
    lost,
  );
  assert.equal(
    await page.evaluate(
      () => window.contexts.filter((c) => !c.isContextLost()).length,
    ),
    1,
  );
  console.log(
    'PASS: an unrestored graphics context automatically restarts in light mode without retaining its old context.',
  );

  await page.evaluate(() => window.unmount());
  await page.waitForFunction(() =>
    window.contexts.every((ctx) => ctx.isContextLost()),
  );
  // Cancelling a pending startup retry must not mount an abandoned scene.
  await page.evaluate(() => {
    window.graphicsFailure = 'all';
    window.mount();
  });
  await page.getByText('Starting a lighter view…', { exact: true }).waitFor();
  await page.evaluate(() => {
    window.unmount();
    window.graphicsFailure = '';
  });
  const cancelled = await page.evaluate(() => window.attempts.length);
  await page.waitForTimeout(1100);
  assert.equal(await page.evaluate(() => window.attempts.length), cancelled);

  // Login must be functional without creating any WebGL context.
  await page.route('**/api/account', (route) =>
    route.fulfill({ json: { user: null, mode: 'account' } }),
  );
  await page.evaluate(() => window.account());
  await page
    .getByRole('button', { name: 'Create account & play', exact: true })
    .waitFor();
  assert.equal(await page.locator('canvas').count(), 0);
  assert.equal(await page.evaluate(() => window.attempts.length), cancelled);
  console.log(
    'PASS: login creates zero graphics contexts; unmount cancels delayed retries.',
  );

  // Produce the decorative login still from the actual town, without live WebGL on login.
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.evaluate(() => {
    localStorage.clear();
    window.welcome();
  });
  await page.waitForFunction(() => !!document.querySelector('canvas'));
  await page.waitForTimeout(2200);
  await page.locator('.town-canvas').screenshot({
    path: directory + '/town-welcome.jpg',
    type: 'jpeg',
    quality: 85,
  });
  await page.evaluate(() => window.unmount());
  await page.waitForFunction(() =>
    window.contexts.every((ctx) => ctx.isContextLost()),
  );

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  await mobile.addInitScript(() =>
    localStorage.setItem('townies-light-graphics', '1'),
  );
  await mobile.goto(`http://127.0.0.1:${server.address().port}`);
  await mobile.waitForFunction(() => window.readyCount === 1);
  const mobileGraphics = await mobile.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return {
      antialias: canvas.getContext('webgl2').getContextAttributes().antialias,
      pixels: canvas.width * canvas.height,
      width: canvas.width,
      height: canvas.height,
    };
  });
  assert.equal(mobileGraphics.antialias, true);
  assert.equal(mobileGraphics.width, 780);
  assert.equal(mobileGraphics.height, 1688);
  assert.ok(mobileGraphics.pixels <= 3000000);
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.waitForFunction(() => {
    const c = document.querySelector('canvas');
    return (
      c.clientWidth === 844 &&
      c.width === c.clientWidth * 2 &&
      c.height === c.clientHeight * 2
    );
  });
  await mobile.setViewportSize({ width: 1366, height: 1024 });
  await mobile.waitForFunction(() => {
    const c = document.querySelector('canvas');
    return (
      c.clientWidth === 1366 && c.width > 1366 && c.width * c.height <= 3000000
    );
  });
  await mobile.evaluate(() => window.unmount());
  console.log(
    'PASS: high-DPI phones render at 2× resolution in both orientations; large touch screens stay within the high-quality pixel budget with antialiasing.',
  );

  // Exercise the adaptive policy against an actual WebGL renderer without frame-timing flakiness.
  const adaptive = await mobile.evaluate(() => {
    localStorage.clear();
    const {
      THREE,
      createTownRenderer,
      resizeTownRenderer,
      updateTownGraphics,
      releaseTownRenderer,
    } = window.graphicsTest;
    const { renderer } = createTownRenderer(),
      canvas = renderer.domElement,
      scene = new THREE.Scene();
    const light = new THREE.DirectionalLight();
    light.position.set(5, 6, 5);
    light.castShadow = true;
    scene.add(light);
    const geometry = new THREE.BoxGeometry(),
      material = new THREE.MeshStandardMaterial(),
      box = new THREE.Mesh(geometry, material);
    box.castShadow = box.receiveShadow = true;
    scene.add(box);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 4, 7);
    camera.lookAt(0, 0, 0);
    resizeTownRenderer(renderer, 390, 844);
    let time = performance.now();
    const advance = (duration, delta) => {
      const end = time + duration;
      while (time < end) {
        time += delta;
        updateTownGraphics(renderer, scene, time);
      }
    };
    advance(180000, 1000 / 60);
    renderer.render(scene, camera);
    const high = renderer.shadowMap.enabled;
    advance(6000, 40);
    renderer.render(scene, camera);
    const balanced =
      !renderer.shadowMap.enabled && renderer.getPixelRatio() === 2;
    advance(14000, 40);
    const lowered = renderer.getPixelRatio() < 2;
    advance(210000, 1000 / 60);
    renderer.render(scene, camera);
    const restored =
      renderer.shadowMap.enabled && renderer.getPixelRatio() === 2;
    const same =
      canvas === renderer.domElement && !renderer.getContext().isContextLost();
    geometry.dispose();
    material.dispose();
    light.shadow.dispose();
    releaseTownRenderer(renderer);
    return { high, balanced, lowered, restored, same };
  });
  await mobile.close();
  assert.deepEqual(adaptive, {
    high: true,
    balanced: true,
    lowered: true,
    restored: true,
    same: true,
  });
  console.log(
    'PASS: measured pressure removes shadows before reducing resolution; quality returns without replacing the graphics context.',
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: total startup failure is recoverable on mobile; retry clears stale errors, and unmount leaves no live context.',
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
