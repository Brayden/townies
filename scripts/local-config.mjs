import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
export async function localConfig(directory = 'outputs/local', port = 3002) {
  const dir = path.resolve(directory);
  await mkdir(dir, { recursive: true });
  const config = JSON.parse(await readFile('wrangler.local.json', 'utf8'));
  config.main = path.resolve('worker.ts');
  config.vars.BETTER_AUTH_URL = `http://localhost:${port}`;
  for (const d of config.d1_databases)
    d.migrations_dir = path.resolve('drizzle');
  await writeFile(
    path.join(dir, 'wrangler.json'),
    JSON.stringify(config, null, 2) + '\n',
  );
  const secrets = path.join(dir, '.dev.vars');
  try {
    await access(secrets);
  } catch {
    await writeFile(
      secrets,
      `BETTER_AUTH_SECRET="${randomBytes(32).toString('hex')}"\n`,
      { mode: 0o600, flag: 'wx' },
    );
  }
  return path.join(dir, 'wrangler.json');
}
