import { registerHooks } from 'node:module';
// Match bundler-style extensionless relative TS imports in direct Node fixtures.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.'))
        throw error;
      for (const extension of ['.ts', '.tsx', '/index.ts']) {
        try {
          return nextResolve(specifier + extension, context);
        } catch {}
      }
      throw error;
    }
  },
});
