import { spawnSync } from 'node:child_process';
import { localConfig } from './local-config.mjs';
if (Number(process.versions.node.split('.')[0]) !== 24)
  throw Error('Use Node 24 (nvm use).');
const config = await localConfig();
const result = spawnSync(
  'npx',
  [
    '--no-install',
    'wrangler',
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
    '--config',
    config,
    '--persist-to',
    'outputs/local/state',
  ],
  { stdio: 'inherit' },
);
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(
  'Local database ready. Run npm run dev. No Cloudflare login is required.',
);
