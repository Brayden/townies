import { readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const target = process.argv.includes('--production')
  ? 'production'
  : process.argv.includes('--staging')
    ? 'staging'
    : null;
if (!target) throw Error('Explicit --production or --staging is required.');
const config = JSON.parse(await readFile('dist/server/wrangler.json', 'utf8'));
if (
  config.vars?.TOWNIES_AUTH_MODE !== 'account' ||
  !config.vars?.BETTER_AUTH_URL?.startsWith('https://') ||
  config.name === 'townies-local' ||
  !config.account_id ||
  config.account_id.startsWith('YOUR_')
)
  throw Error('Refusing to deploy a local or placeholder build.');
if (
  target === 'production' &&
  (config.name !== 'townies' ||
    config.vars.BETTER_AUTH_URL !== 'https://townies.town')
)
  throw Error(
    'The official production release must target the existing Townies Worker.',
  );
if (
  target === 'staging' &&
  (config.name === 'townies' ||
    config.vars.BETTER_AUTH_URL === 'https://townies.town')
)
  throw Error('Staging must not use production resources.');
await rm('dist/server/.dev.vars', { force: true });
const result = spawnSync(
  'npx',
  [
    '--no-install',
    'wrangler',
    'deploy',
    '--config',
    'dist/server/wrangler.json',
  ],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
