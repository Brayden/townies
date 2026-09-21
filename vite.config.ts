import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig, lazyPlugins, type ViteUserConfig } from 'vite-plus';

const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

export default defineConfig(async (): Promise<ViteUserConfig> => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    fmt: {
      singleQuote: true,
      printWidth: 80,
      sortPackageJson: false,
      ignorePatterns: [
        'package-lock.json',
        'pnpm-lock.yaml',
        'yarn.lock',
        'bun.lock',
        'bun.lockb',
      ],
    },
    lint: {
      plugins: [
        'eslint',
        'typescript',
        'unicorn',
        'oxc',
        'react',
        'import',
        'jsx-a11y',
        'nextjs',
      ],
      categories: {
        correctness: 'error',
      },
      env: {
        builtin: true,
        browser: true,
        node: true,
      },
      options: {
        typeAware: true,
        typeCheck: true,
      },
      ignorePatterns: [
        '.next/**',
        '.vinext/**',
        'out/**',
        'build/**',
        'dist/**',
        'coverage/**',
        'next-env.d.ts',
        'outputs/**',
        'work/**',
        '.wrangler/**',
      ],
      rules: {
        'no-array-constructor': 'error',
        'no-var': 'error',
        'prefer-const': 'error',
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
        'import/no-anonymous-default-export': 'warn',
        'react/display-name': 'error',
        'react/capitalized-calls': 'error',
        'react/error-boundaries': 'error',
        'react/exhaustive-effect-dependencies': 'error',
        'react/globals': 'error',
        'react/hooks': 'error',
        'react/immutability': 'error',
        'react/incompatible-library': 'error',
        'react/invariant': 'error',
        'react/jsx-no-comment-textnodes': 'error',
        'react/memo-dependencies': 'error',
        'react/no-deriving-state-in-effects': 'error',
        'react/no-unescaped-entities': 'error',
        'react/preserve-manual-memoization': 'error',
        'react/purity': 'error',
        'react/refs': 'error',
        'react/require-render-return': 'error',
        'react/rule-suppression': 'error',
        'react/rules-of-hooks': 'error',
        'react/set-state-in-effect': 'error',
        'react/set-state-in-render': 'error',
        'react/static-components': 'error',
        'react/syntax': 'error',
        'react/todo': 'error',
        'react/unsupported-syntax': 'error',
        'react/use-memo': 'error',
        'react/void-use-memo': 'error',
        'typescript/ban-ts-comment': 'error',
        'typescript/no-deprecated': 'error',
        'typescript/no-empty-object-type': 'error',
        'typescript/no-explicit-any': 'error',
        'typescript/no-namespace': 'error',
        'typescript/no-require-imports': 'error',
        'typescript/no-unnecessary-type-constraint': 'error',
        'typescript/no-unsafe-function-type': 'error',
        'vite-plus/prefer-vite-plus-imports': 'error',
      },
      jsPlugins: [
        {
          name: 'vite-plus',
          specifier: 'vite-plus/oxlint-plugin',
        },
      ],
    },
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: lazyPlugins(() => [
      vinext(),
      cloudflare({
        persistState: { path: 'outputs/local/state' },
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        configPath:
          process.env.TOWNIES_WRANGLER_CONFIG ?? 'wrangler.local.json',
      }),
    ]),
  };
});
