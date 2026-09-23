import assert from 'node:assert/strict';
import {
  resolveDependencyDirectory,
  runtimePackageDirectories,
} from '../scripts/license-dependencies.mjs';

const packages = {
  '': {
    dependencies: { app: '1.0.0', '@scope/direct': '1.0.0' },
    devDependencies: { vite: '8.0.0' },
  },
  'node_modules/app': {
    dependencies: { shared: '1.0.0', nested: '2.0.0' },
    peerDependencies: { vite: '8.0.0' },
  },
  'node_modules/@scope/direct': {
    dependencies: { leaf: '1.0.0' },
  },
  'node_modules/leaf': {},
  'node_modules/shared': {},
  'node_modules/nested': {},
  'node_modules/app/node_modules/nested': {
    dependencies: { shared: '2.0.0' },
  },
  'node_modules/app/node_modules/nested/node_modules/shared': {},
  'node_modules/vite': {
    dependencies: { build: '1.0.0' },
  },
  'node_modules/build': {},
};

assert.equal(
  resolveDependencyDirectory(packages, 'node_modules/app', 'nested'),
  'node_modules/app/node_modules/nested',
  'dependencies resolve from the nearest installed package directory',
);
assert.equal(
  resolveDependencyDirectory(
    packages,
    'node_modules/app/node_modules/nested',
    'shared',
  ),
  'node_modules/app/node_modules/nested/node_modules/shared',
  'deeply nested dependencies resolve before hoisted packages',
);
assert.equal(
  resolveDependencyDirectory(packages, 'node_modules/@scope/direct', 'leaf'),
  'node_modules/leaf',
  'scoped packages can resolve hoisted dependencies',
);

assert.deepEqual(
  [...runtimePackageDirectories({ packages })].sort((a, b) =>
    a.localeCompare(b),
  ),
  [
    'node_modules/@scope/direct',
    'node_modules/app',
    'node_modules/app/node_modules/nested',
    'node_modules/app/node_modules/nested/node_modules/shared',
    'node_modules/leaf',
    'node_modules/shared',
  ],
  'only regular dependency edges reachable from root dependencies are included',
);

assert.throws(
  () =>
    runtimePackageDirectories({
      packages: {
        '': { dependencies: { missing: '1.0.0' } },
      },
    }),
  /Cannot resolve runtime dependency missing from the project root/,
  'an incomplete lockfile must fail instead of silently omitting a dependency',
);

console.log(
  'PASS: runtime license traversal follows nested and hoisted dependencies while excluding dev and peer-only packages.',
);
