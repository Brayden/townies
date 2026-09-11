# Passkeys, installed display and chat placement

## Passkeys

Players create an account with the existing email/password flow, then open Settings → Passkeys → Add a passkey. Registration requires Better Auth's fresh authenticated session. Optional names help distinguish saved credentials. Settings lists passkeys and requires an inline confirmation before removal. Password login remains available, including after the last passkey is removed.

The login tab offers “Log in with a passkey” in browsers exposing WebAuthn on a secure origin. No email is needed for this flow. Registration requests a discoverable credential (`residentKey: required`) so a logged-out device can select its account. The official `@better-auth/passkey` plugin is pinned to 1.7.4, matching the existing Better Auth installation. User verification follows the plugin's preferred policy; compatible authenticators may use biometrics, PIN, or hardware-key interaction. It is not restricted to platform authenticators, allowing synced passkeys, external keys and cross-device flows supported by the browser.

The relying-party ID and expected origin derive from the configured `BETTER_AUTH_URL` (production: `townies.town` / `https://townies.town`). Signed challenge cookies, short-lived one-use challenges, signature/counter checks, fresh-session registration and ownership checks are provided by the plugin. Explicit per-IP limits cover generation/verification endpoints. The existing origin and body-size checks also apply. Passkey creation does not change account identity, resident IDs, town membership or saved progress.

Migration `0018_silent_iron_fist.sql` only adds `auth_passkeys` and its user/unique-credential indexes to shared D1. It stores public keys and credential metadata, never device private keys or biometrics. Town Durable Objects still apply only game migrations 0000–0015. Apply 0018 before publishing the Worker that enables the plugin. Rolling back the Worker can leave the additive table in place safely.

If a settings operation reports a stale session, sign out and back in before trying again. Existing accounts retain password access. Unsupported browsers do not show a nonfunctional login button; Settings explains the limitation. Cancellation keeps the password path usable.

## iOS and installed display

The app manifest requests `fullscreen`, with `/` as its stable ID, scope and start URL. Apple standalone capability remains enabled. `black-translucent` status-bar styling and `viewport-fit=cover` extend the view behind the system area, with safe-area padding for important controls.

iOS does not expose a dependable PWA option to hide the clock/battery status icons completely. This is an edge-to-edge web-app presentation, not a promise of native-app status-bar hiding. Safari's address bar is absent when actually launched as an installed standalone web app. Existing home-screen installations may need to be re-added to pick up display metadata changes. See Apple's supported meta tags: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html.

## Town chat

The chat launcher is separate from TownHeader and anchored to the lower-left above the activity dock. The conversation opens above it. Mobile movement controls sit above the launcher and are hidden while chatting, as are nearby action prompts. Unread counts, accessible labels, expanded state and close/toggle behavior are preserved.

## Verification

- `tests/passkeys-browser.mjs`: real UI + actual local Worker/D1, with a Chrome virtual authenticator. Covers account creation, passkey registration, same-account passwordless login, one-use challenge replay rejection, unauthorized registration, cross-origin rejection, cross-account listing/deletion protection, cancellation, password fallback, removal and rejection of a removed key. Refuses non-local URLs.
- `tests/accounts-api.mjs`: existing local account, resident, private-town, authorization and logout regression checks.
- `tests/hud-layout-browser.mjs`: chat/dock/joystick/panel placement at 320px and 390px portrait, landscape and desktop, with normal and job docks.
- Account-name moderation and unread-chat tests, type checking and Cloudflare build.
- Actual local Worker HTML/manifest checked for Apple status-bar metadata, viewport-fit and fullscreen display.

Tests use virtual WebAuthn and desktop viewport emulation. Physical Face ID/Touch ID, iCloud/Google syncing and installed iOS status-bar appearance have not been exercised on real devices here. Production verification is read-only; test accounts and virtual credentials are confined to the local database.

Better Auth plugin reference: https://better-auth.com/docs/plugins/passkey.
