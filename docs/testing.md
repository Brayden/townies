# Testing

Use Node 24. Run `npm ci` and `npm run setup` before local development. All account and multiplayer fixtures must stay on localhost.

| Command                    | Coverage                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm run typecheck`        | TypeScript project validation                                                                         |
| `npm run lint`             | No increased findings per file/rule relative to the explicit legacy baseline                          |
| `npm run format:check`     | Formatting for new files, infrastructure, docs and test scripts                                       |
| `npm test`                 | Geometry, jobs, progression, camera, UI/state helpers and other deterministic suites                  |
| `npm run build`            | Local Worker and browser bundles                                                                      |
| `npm run test:browser`     | Camera controls, graphics recovery, HUD layout and chat read synchronization                          |
| `npm run test:integration` | Isolated built Worker; account/session rules, Durable Objects, legacy import, WebSockets and passkeys |

Install the browser with `npx playwright install chromium` (`--with-deps` on Linux). `CHROME_PATH` can select an installed Chrome for local debugging. CI uses Playwright's bundled browser.

`npm run test:browser` builds the local application before running the suites so menu fixtures always use current compiled stylesheets, including on a clean checkout. When running an individual browser test directly, run `npm run build` first.

Integration tests create a unique directory under `outputs/`, initialize their own database, allocate a local port and stop their server on completion. Logs remain in that directory for diagnosis. Do not publish logs, databases, cookies or local fixtures. No Cloudflare account is necessary.

## Legacy lint and formatting debt

The first public version includes a substantial game built before a consistent lint/format gate existed. `.github/lint-baseline.json` records existing counts by file and rule. New files start at zero, and increases fail CI. This count-based gate does not detect replacing one old finding with a different finding of the same rule; review must still inspect changed code. Reduce baseline counts when cleaning a module, and never increase them to make a PR pass.

`.github/format-legacy.json` lists existing game source files excluded from the formatter gate. This avoids a mass rewrite of dense source and source-instrumented tests. All other supported files are checked. New files are checked even inside an existing game directory. Remove files from the exception list as focused formatting cleanups establish that behavior and test instrumentation are preserved. Avoid running the broad `npm run format` command during an unrelated change; use `npx oxfmt path/to/file` instead.

The standalone legacy `mowing-route.mjs` and `*-api.mjs` fixtures other than `accounts-api.mjs` use the former header-auth setup. They are retained as specifications but are not part of the account-mode CI suite. Porting those scenarios to the isolated authenticated runner is tracked on the roadmap. Do not mistake those scripts for full production security coverage.

## Validation expectations

Run the deterministic suite and typecheck for every code change. Run browser checks when changing input, HUD, graphics or client synchronization. Run integration checks for identity, storage, multiplayer, migrations, purchases, permissions or server changes. Test touch behavior and low graphics settings when relevant; headless tests do not replace device testing.

CI must never receive production credentials on a public PR. Screenshots are optional diagnostic artifacts, not required for every change. Existing camera screenshots can be enabled explicitly with `TOWNIES_SCREENSHOTS=1`.

## Local proxy diagnostics

The integration runner prints sanitized local Worker diagnostics on failure. Cloudflare's Linux development proxy can lose a following request when an earlier response abandons a request body ([upstream report](https://github.com/cloudflare/workers-sdk/issues/15203)). Account requests keep a 16 KiB body limit and finish that bounded read before returning an origin rejection; the rejection still occurs before session revocation or authentication. CI checks that a rejected cross-origin logout leaves the session intact and that the next valid logout succeeds.
