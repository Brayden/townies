import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const baseline = JSON.parse(readFileSync('.github/lint-baseline.json', 'utf8'));
const result = spawnSync('npx', ['--no-install', 'oxlint', '--format=json'], {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});
if (result.error || !result.stdout?.trim().startsWith('{'))
  throw (
    result.error ??
    Error(result.stderr || 'Lint failed to produce diagnostics.')
  );
const report = JSON.parse(result.stdout);
const counts = {};
for (const diagnostic of report.diagnostics) {
  const key =
    diagnostic.filename + ' :: ' + (diagnostic.code ?? diagnostic.message);
  counts[key] = (counts[key] ?? 0) + 1;
}
let failed = false;
for (const [key, count] of Object.entries(counts)) {
  if (count > (baseline[key] ?? 0)) {
    console.error(`${key}: ${count} findings (baseline ${baseline[key] ?? 0})`);
    failed = true;
  }
}
if (result.status !== 0 && report.diagnostics.length === 0)
  throw Error(result.stderr || 'Lint execution failed.');
if (failed) {
  console.error(
    'New lint debt detected. Run npx oxlint for details; fix findings without increasing the baseline.',
  );
  process.exit(1);
}
console.log(
  `Lint passed: ${report.diagnostics.length} existing findings; no increased per-file/rule counts. See docs/testing.md.`,
);
