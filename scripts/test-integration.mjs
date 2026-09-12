import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, open } from 'node:fs/promises';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
function run(command, args, env = process.env) {
  const r = spawnSync(command, args, { stdio: 'inherit', env });
  if (r.status !== 0) throw Error(`${command} failed (${r.status})`);
}
run(process.execPath, ['scripts/build.mjs']);
const dir = path.resolve('outputs/integration-' + Date.now());
await mkdir(dir, { recursive: true });
const probe = createServer();
await new Promise((r) => probe.listen(0, '127.0.0.1', r));
const port = probe.address().port;
await new Promise((r) => probe.close(r));
const base = `http://localhost:${port}`,
  state = dir + '/state',
  config = JSON.parse(await readFile('dist/server/wrangler.json', 'utf8'));
if (config.name !== 'townies-local')
  throw Error('Integration tests require a local build.');
config.main = path.resolve('dist/server/index.js');
config.assets.directory = path.resolve('dist/client');
config.routes = [];
delete config.account_id;
config.vars = { ...config.vars, BETTER_AUTH_URL: base };
for (const d of config.d1_databases) d.migrations_dir = path.resolve('drizzle');
await writeFile(dir + '/wrangler.json', JSON.stringify(config, null, 2));
await writeFile(
  dir + '/.dev.vars',
  `BETTER_AUTH_SECRET="${randomBytes(32).toString('hex')}"\n`,
  { mode: 0o600 },
);
run('npx', [
  '--no-install',
  'wrangler',
  'd1',
  'migrations',
  'apply',
  'DB',
  '--local',
  '--config',
  dir + '/wrangler.json',
  '--persist-to',
  state,
]);
const log = await open(dir + '/server.log', 'w');
const server = spawn(
  'npx',
  [
    '--no-install',
    'wrangler',
    'dev',
    '--local',
    '--config',
    dir + '/wrangler.json',
    '--port',
    String(port),
    '--persist-to',
    state,
  ],
  { stdio: ['ignore', log.fd, log.fd], detached: process.platform !== 'win32' },
);
const env = {
  ...process.env,
  TOWNIES_TEST_URL: base,
  TOWNIES_STATE_DIR: state + '/v3',
  TOWNIES_TEST_WORKER: 'townies-local',
};
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null)
      throw Error('Local server exited. See ' + dir + '/server.log');
    try {
      const r = await fetch(base + '/api/account');
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw Error('Local server did not become ready.');
  for (const file of [
    'accounts-api.mjs',
    'town-objects.mjs',
    'town-migration.mjs',
    'town-websockets.mjs',
    'passkeys-browser.mjs',
  ])
    run(process.execPath, ['tests/' + file], env);
  console.log(
    'All account, town, migration, WebSocket and passkey integration suites passed.',
  );
} catch (error) {
  // Only runner-created synthetic accounts exist here. Redact token-like values
  // before printing diagnostics to public CI; keep the full log local/ignored.
  const diagnostics = stripVTControlCharacters(
    await readFile(dir + '/server.log', 'utf8'),
  )
    .split('\n')
    .slice(-160)
    .join('\n')
    .replace(/[A-Za-z0-9_+/=-]{24,}/g, '[redacted]')
    .replace(/[^\s@]+@[^\s@]+/g, '[email]');
  console.error('Sanitized local Worker diagnostics:\n' + diagnostics);
  throw error;
} finally {
  try {
    if (process.platform === 'win32') server.kill();
    else process.kill(-server.pid, 'SIGTERM');
  } catch {}
  await log.close();
}
