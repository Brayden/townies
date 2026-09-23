import path from 'node:path';

function dependencyCandidates(directory, dependency) {
  const candidates = [];
  let current = directory;
  while (true) {
    if (path.posix.basename(current) !== 'node_modules')
      candidates.push(path.posix.join(current, 'node_modules', dependency));
    if (!current) break;
    const parent = path.posix.dirname(current);
    current = parent === '.' ? '' : parent;
  }
  return candidates;
}

export function resolveDependencyDirectory(packages, directory, dependency) {
  return dependencyCandidates(directory, dependency).find((candidate) =>
    Object.hasOwn(packages, candidate),
  );
}

export function runtimePackageDirectories(lock) {
  const packages = lock.packages;
  if (!packages?.[''])
    throw new Error('package-lock.json has no root package entry.');

  const runtime = new Set();
  const pending = Object.keys(packages[''].dependencies ?? {}).map(
    (dependency) => ({ directory: '', dependency }),
  );

  while (pending.length) {
    const { directory, dependency } = pending.pop();
    const resolved = resolveDependencyDirectory(
      packages,
      directory,
      dependency,
    );
    if (!resolved)
      throw new Error(
        `Cannot resolve runtime dependency ${dependency} from ${directory || 'the project root'} in package-lock.json.`,
      );
    if (runtime.has(resolved)) continue;
    runtime.add(resolved);
    for (const child of Object.keys(packages[resolved].dependencies ?? {}))
      pending.push({ directory: resolved, dependency: child });
  }

  return runtime;
}
