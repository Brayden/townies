import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
if (process.env.RELEASE_ENABLED !== 'true')
  throw Error(
    'Configure protected environments before enabling releases. See docs/releases.md.',
  );
const target = process.env.DEPLOY_TARGET;
if (!['staging', 'production'].includes(target)) throw Error('Unknown target');
const config = JSON.parse(process.env.DEPLOY_CONFIG ?? '{}');
if (!config.account_id || !config.d1_databases?.[0]?.database_id)
  throw Error('Missing deployment resources');
if (config.name !== (target === 'production' ? 'townies' : 'townies-staging'))
  throw Error('Unexpected official Worker identity');
const url = new URL(config.vars?.BETTER_AUTH_URL);
if (
  url.protocol !== 'https:' ||
  (target === 'production'
    ? url.origin !== 'https://townies.town'
    : url.hostname === 'townies.town')
)
  throw Error('Wrong auth origin');
if (config.vars.TOWNIES_AUTH_MODE !== 'account')
  throw Error('Account authentication required');
if (
  Object.keys(config.vars).some((key) =>
    /SECRET|TOKEN|PASSWORD|PRIVATE_KEY/i.test(key),
  )
)
  throw Error('Keep secrets in Cloudflare, not the configuration variable');
config.main = path.resolve('worker.ts');
for (const database of config.d1_databases)
  database.migrations_dir = path.resolve('drizzle');
await mkdir('outputs/release', { recursive: true });
await writeFile(
  'outputs/release/wrangler.json',
  JSON.stringify(config, null, 2),
);
console.log(`Validated ${target} target ${config.name}.`);
