import assert from 'node:assert/strict';
import {
  distributedPackageDirectories,
  resolveDependencyDirectory,
} from '../scripts/license-dependencies.mjs';

const packages = {
  '': {
    dependencies: {
      app: '1.0.0',
      '@scope/direct': '1.0.0',
      workspace: '1.0.0',
    },
    devDependencies: {
      '@vitejs/plugin-rsc': '1.0.0',
      vite: '8.0.0',
    },
  },
  'node_modules/app': {
    dependencies: { shared: '1.0.0', nested: '2.0.0' },
    peerDependencies: {
      'optional-peer': '1.0.0',
      'react-is': '1.0.0',
      vite: '8.0.0',
    },
    peerDependenciesMeta: { 'optional-peer': { optional: true } },
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
  'node_modules/react-is': {},
  'node_modules/vite': {
    dependencies: { build: '1.0.0' },
  },
  'node_modules/build': {},
  'node_modules/@vitejs/plugin-rsc': {
    dependencies: { 'injected-runtime': '1.0.0' },
    peerDependencies: { vite: '8.0.0' },
  },
  'node_modules/injected-runtime': {},
  'node_modules/workspace': {
    link: true,
    resolved: 'packages/workspace',
  },
  'packages/workspace': {
    dependencies: { 'workspace-leaf': '1.0.0' },
  },
  'node_modules/workspace-leaf': {},
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
  [
    ...distributedPackageDirectories(
      { packages },
      { includedDevDependencies: ['@vitejs/plugin-rsc'] },
    ),
  ].sort((a, b) => a.localeCompare(b)),
  [
    'node_modules/@scope/direct',
    'node_modules/@vitejs/plugin-rsc',
    'node_modules/app',
    'node_modules/app/node_modules/nested',
    'node_modules/app/node_modules/nested/node_modules/shared',
    'node_modules/injected-runtime',
    'node_modules/leaf',
    'node_modules/react-is',
    'node_modules/shared',
    'node_modules/workspace',
    'node_modules/workspace-leaf',
  ],
  'distribution follows runtime peers, injected build code, links, and regular dependencies',
);

assert.throws(
  () =>
    distributedPackageDirectories({
      packages: {
        '': { dependencies: { missing: '1.0.0' } },
      },
    }),
  /Cannot resolve distributed dependency missing from the project root/,
  'an incomplete lockfile must fail instead of silently omitting a dependency',
);

assert.throws(
  () =>
    distributedPackageDirectories(
      { packages },
      { includedDevDependencies: ['not-declared'] },
    ),
  /Included build dependency not-declared is not declared/,
  'an obsolete build-runtime exception must fail visibly',
);

assert.throws(
  () =>
    distributedPackageDirectories({
      packages: {
        '': { dependencies: { workspace: '1.0.0' } },
        'node_modules/workspace': {
          link: true,
          resolved: 'packages/missing',
        },
      },
    }),
  /Cannot resolve package-lock link node_modules\/workspace to packages\/missing/,
  'a broken workspace link must fail instead of dropping transitive dependencies',
);

console.log(
  'PASS: distributed license traversal covers runtime peers, injected build code, workspace links, and nested or hoisted dependencies.',
);
