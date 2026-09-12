import { spawnSync } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { localConfig } from './local-config.mjs';
const target = process.argv.includes('--production')
  ? 'production'
  : process.argv.includes('--staging')
    ? 'staging'
    : 'local';
const config =
  target === 'local'
    ? await localConfig()
    : (process.env.TOWNIES_WRANGLER_CONFIG ?? `wrangler.${target}.json`);
const settings = JSON.parse(await readFile(config, 'utf8'));
if (
  target !== 'local' &&
  (!settings.account_id ||
    settings.account_id.startsWith('YOUR_') ||
    settings.vars?.TOWNIES_AUTH_MODE !== 'account' ||
    !settings.vars?.BETTER_AUTH_URL?.startsWith('https://'))
)
  throw Error(
    'Supply a real, private deployment configuration. See docs/releases.md.',
  );
const result = spawnSync('npx', ['--no-install', 'vinext', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, TOWNIES_WRANGLER_CONFIG: config },
});
// Never leave a local auth secret in a deployable archive.
await rm('dist/server/.dev.vars', { force: true });
if (result.status !== 0) process.exit(result.status ?? 1);
