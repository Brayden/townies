import { spawn } from 'node:child_process';
import { localConfig } from './local-config.mjs';
const config = await localConfig();
const child = spawn(
  'npx',
  ['--no-install', 'vinext', 'dev', '--port', '3002'],
  {
    stdio: 'inherit',
    env: { ...process.env, TOWNIES_WRANGLER_CONFIG: config },
  },
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 1));
