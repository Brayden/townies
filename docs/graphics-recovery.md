# Graphics startup and recovery

Reports of “The 3D view couldn’t start” come from failure to create the WebGL 2 renderer, before town geometry is constructed. We do not yet have diagnostics from affected devices, so this change mitigates resource pressure and transient failures without asserting one root cause for every report. Three r186 requires WebGL 2; disabling or blocking that capability cannot be fixed by switching quality settings.

The account screen now uses `public/town-welcome.jpg`, a still captured from the actual town, instead of building a full decorative town and a second renderer after login. Login remains usable when WebGL is unavailable.

`townRenderer.ts` shares graphics settings between outdoor and indoor views:

- Touch-first devices, mobile user agents, devices reporting at most 4 GB memory, and devices with a saved lightweight recovery preference start without multisampling or shadows, at pixel ratio up to 2 for clear edges on high-density phones.
- Other devices try the standard renderer and immediately fall back to default-power lightweight graphics if creation fails. Successful fallback and recovery save a local device preference.
- Framebuffers are capped at 2 million pixels in light mode and 3 million in standard mode, including after viewport changes. Zero-size containers are clamped before sizing or camera aspect calculations outdoors.
- Creation checks reject missing/already-lost contexts. Failed attempts and unmounted renderers explicitly release their WebGL contexts. Interior teardown also disposes the shadow render target.

TownScene gives refused startup attempts two delayed retries (800 ms, then 1,600 ms). Permanent failure ends in a usable recovery panel; manual retry starts a fresh bounded attempt sequence. Effect cleanup cancels pending retry timers.

On context loss the scene stops movement and detaches its movement API. Native restoration resumes with shadows disabled and the lighter pixel budget. If native restoration has not occurred within 2.5 seconds, the scene makes one automatic lightweight restart per mount/manual retry. A further loss waits for native restoration or an explicit retry, avoiding an endless restart loop. Existing camera continuity survives rebuilding. The error panel offers selectable browser/viewport/context-creation details to share with support; these contain no account credentials or town data and are not automatically transmitted.

Both renderers isolate their imperative canvas host from React error content. Removing an error message cannot remove a newly created canvas.

## Verification

`node tests/graphics-browser.mjs` runs isolated browser checks without accounts or server data: forced high-performance rejection, captured creation diagnostics, native context restoration, repeated scene remounts and context release, bounded permanent failure, temporary failure with automatic delayed success, automatic restart after context loss, cancellation on unmount, zero-context login, manual mobile-sized retry, and fresh touch/high-DPI defaults. It also captures the clean town still into ignored test output. The public image is deliberately updated separately.

`node tests/camera-browser.mjs` checks pan/orbit/zoom continuity, movement corrections, scenery changes, focus/reset behavior, and camera continuity through an automatic graphics restart. Override `PLAYWRIGHT_MODULE` and `CHROME_PATH` to run on other local installations.

These are headless Chromium tests using software graphics with the GPU blocklist bypassed. Touch/viewport emulation is not a physical-phone or social-app-browser test; driver-specific compatibility remains unverified. If failures continue, collect the error panel details and the affected browser/device before narrowing the cause further.

The initial light-mode cap of 1 CSS pixel per render pixel made high-density phones visibly pixelated. Light mode now uses up to 2× resolution within its 2-million-pixel budget, retaining default-power context creation, no multisampling/shadows, and the existing retry/recovery behavior. Browser checks verify portrait and landscape phone resolution plus the large-touch-screen budget.
