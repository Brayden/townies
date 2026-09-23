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

function dependencyMetadata(packages, directory) {
  let metadataDirectory = directory;
  const visited = new Set();
  while (packages[metadataDirectory]?.link) {
    if (visited.has(metadataDirectory))
      throw new Error(`Circular package-lock link at ${metadataDirectory}.`);
    visited.add(metadataDirectory);
    const resolved = packages[metadataDirectory].resolved;
    if (
      typeof resolved !== 'string' ||
      path.posix.isAbsolute(resolved) ||
      path.posix.normalize(resolved).startsWith('../')
    )
      throw new Error(
        `Invalid package-lock link target for ${metadataDirectory}.`,
      );
    metadataDirectory = path.posix.normalize(resolved);
    if (!Object.hasOwn(packages, metadataDirectory))
      throw new Error(
        `Cannot resolve package-lock link ${directory} to ${metadataDirectory}.`,
      );
  }
  return { directory: metadataDirectory, info: packages[metadataDirectory] };
}

export function distributedPackageDirectories(
  lock,
  { includedDevDependencies = [] } = {},
) {
  const packages = lock.packages;
  const root = packages?.[''];
  if (!root) throw new Error('package-lock.json has no root package entry.');

  const rootDependencies = new Set(Object.keys(root.dependencies ?? {}));
  const rootDevDependencies = new Set(Object.keys(root.devDependencies ?? {}));
  const includedDev = new Set(includedDevDependencies);
  for (const dependency of includedDev) {
    if (
      !rootDevDependencies.has(dependency) &&
      !rootDependencies.has(dependency)
    )
      throw new Error(
        `Included build dependency ${dependency} is not declared by the project root.`,
      );
  }

  const distributed = new Set();
  const pending = [...rootDependencies, ...includedDev].map((dependency) => ({
    directory: '',
    dependency,
  }));

  while (pending.length) {
    const { directory, dependency } = pending.pop();
    const resolved = resolveDependencyDirectory(
      packages,
      directory,
      dependency,
    );
    if (!resolved)
      throw new Error(
        `Cannot resolve distributed dependency ${dependency} from ${directory || 'the project root'} in package-lock.json.`,
      );
    if (distributed.has(resolved)) continue;
    distributed.add(resolved);

    const metadata = dependencyMetadata(packages, resolved);
    for (const child of Object.keys(metadata.info.dependencies ?? {}))
      pending.push({ directory: metadata.directory, dependency: child });

    for (const peer of Object.keys(metadata.info.peerDependencies ?? {})) {
      if (metadata.info.peerDependenciesMeta?.[peer]?.optional) continue;
      // A direct dev dependency that only satisfies a production package's
      // peer is still project-owned build tooling. Build dependencies whose
      // code is copied into the deployable output are explicit roots above.
      if (
        rootDevDependencies.has(peer) &&
        !rootDependencies.has(peer) &&
        !includedDev.has(peer)
      )
        continue;
      pending.push({ directory: metadata.directory, dependency: peer });
    }
  }

  return distributed;
}
