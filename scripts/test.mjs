import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const mode = process.argv[2] ?? 'unit';
const browser = [
  'camera-browser.mjs',
  'graphics-browser.mjs',
  'hud-layout-browser.mjs',
  'planning-panel-browser.mjs',
  'town-panel-browser.mjs',
  'chat-read-sync.mjs',
];
const integration = [
  'mowing-route.mjs',
  'town-objects.mjs',
  'town-websockets.mjs',
  'town-migration.mjs',
];
const files =
  mode === 'browser'
    ? browser
    : (await readdir('tests'))
        .filter(
          (f) =>
            f.endsWith('.mjs') &&
            !f.endsWith('-api.mjs') &&
            !f.endsWith('-browser.mjs') &&
            !browser.includes(f) &&
            !integration.includes(f),
        )
        .sort();
for (const file of files) {
  console.log(`\nTesting ${file}`);
  const result = spawnSync(
    process.execPath,
    ['--import', './tests/helpers/resolve-ts.mjs', 'tests/' + file],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`\n${files.length} ${mode} suites passed.`);
