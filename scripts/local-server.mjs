import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const config = JSON.parse(await readFile('dist/server/wrangler.json', 'utf8'));
if (config.name !== 'townies-local')
  throw Error('Build locally with npm run build before starting.');
const child = spawn(
  'npx',
  [
    '--no-install',
    'wrangler',
    'dev',
    '--local',
    '--config',
    'dist/server/wrangler.json',
    '--port',
    '3002',
    '--persist-to',
    'outputs/local/state',
    '--env-file',
    'outputs/local/.dev.vars',
  ],
  { stdio: 'inherit' },
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 1));
