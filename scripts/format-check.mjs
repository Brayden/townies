import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const legacy = new Set(
  JSON.parse(readFileSync('.github/format-legacy.json', 'utf8')),
);
const listing = spawnSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' },
);
if (listing.status !== 0) throw Error(listing.stderr);
const files = [...new Set(listing.stdout.split('\0'))].filter(
  (file) =>
    /\.(?:[cm]?[jt]sx?|json|ya?ml|css|md)$/.test(file) &&
    !legacy.has(file) &&
    file !== 'package-lock.json' &&
    !file.startsWith('drizzle/meta/') &&
    !file.startsWith('.openai/'),
);
const result = spawnSync(
  'npx',
  ['--no-install', 'oxfmt', '--check', ...files],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
