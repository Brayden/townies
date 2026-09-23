import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { distributedPackageDirectories } from './license-dependencies.mjs';
const lockText = await readFile('package-lock.json', 'utf8');
const digest = createHash('sha256').update(lockText).digest('hex');
const lock = JSON.parse(lockText);
const overrides = JSON.parse(
  await readFile('scripts/license-overrides.json', 'utf8'),
);
const sections = [
  `Third-party software included with Townies. See THIRD_PARTY_NOTICES.md.\nLockfile SHA256: ${digest}`,
];
const missing = [];
// The RSC plugin injects its runtime modules into the deployed client and
// worker bundles even though the package itself is a direct dev dependency.
const distributedDirectories = distributedPackageDirectories(lock, {
  includedDevDependencies: ['@vitejs/plugin-rsc'],
});
async function notices(directory, depth = 0) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (
      entry.isFile() &&
      /^(licen[sc]e|copying|notice)(?:[.-]|$)/i.test(entry.name)
    )
      output.push(file);
    else if (entry.isDirectory() && depth < 3 && entry.name !== 'node_modules')
      output.push(...(await notices(file, depth + 1)));
  }
  return output.sort((a, b) => a.localeCompare(b));
}
for (const [directory, info] of Object.entries(lock.packages).sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  if (!distributedDirectories.has(directory)) continue;
  const pkg = JSON.parse(
    await readFile(path.join(directory, 'package.json'), 'utf8'),
  );
  const identity = `${pkg.name}@${pkg.version}`;
  const names = await notices(directory);
  if (overrides[identity]) names.push(overrides[identity]);
  if (!names.length) {
    missing.push(identity);
    continue;
  }
  const texts = await Promise.all(
    names.map(async (name) => `${name}\n${await readFile(name, 'utf8')}`),
  );
  sections.push(
    `${identity} (package license declaration: ${pkg.license ?? info.license ?? 'See license text'})\n${texts.join('\n\n')}`,
  );
}
if (missing.length)
  throw Error(
    'Missing license text; review before distribution: ' + missing.join(', '),
  );
const output = sections.join('\n\n' + '='.repeat(72) + '\n\n') + '\n';
if (process.argv.includes('--check')) {
  if ((await readFile('public/third-party-licenses.txt', 'utf8')) !== output)
    throw Error(
      'Dependency notices are stale. Run npm run licenses and commit the result.',
    );
} else await writeFile('public/third-party-licenses.txt', output);
console.log(
  `Verified notices for ${sections.length - 1} distributed dependency packages.`,
);
