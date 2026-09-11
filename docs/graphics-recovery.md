# Outdoor graphics recovery

The previous outdoor renderer disposed Three.js objects but did not explicitly release its WebGL context. Scene rebuilds can occur at sign-in, town changes, home upgrades, and map layout changes. The interior renderer already released its context. We cannot establish that retained contexts caused a particular browser's startup failure without that browser's graphics diagnostics.

`townRenderer.ts` owns context creation and release. It tries the normal antialiased view, then a default-power view without antialiasing or shadows and with pixel ratio capped at 1. Failed construction attempts release any context they created. Cleanup disposes the renderer and explicitly loses its context; the scene also disposes shadow targets and instance buffers.

TownScene listens for graphics context loss, stops movement, detaches the parent's movement API, and pauses simulation while the picture is unavailable. Native restoration clears the error and reconnects the API. A retry button rebuilds in lightweight mode. The canvas has its own DOM container so removing the recovery message cannot remove a newly created canvas. Startup success clears stale errors. The login screen waits for the account check before mounting its decorative scene, avoiding an unnecessary context for returning signed-in players.

`node tests/graphics-browser.mjs` runs isolated browser checks without accounts or server data: forced high-performance rejection, context loss/restoration, five scene remounts with old-context release, total startup failure, a mobile-sized retry, and final teardown. Override `PLAYWRIGHT_MODULE` and `CHROME_PATH` for other local browser installations. The mobile check is a desktop browser at a mobile viewport, not a physical-phone test. It does not reproduce driver-specific failures.

Reference: [MDN recommends releasing unused WebGL contexts eagerly](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices). Three.js documents [renderer disposal and context-loss methods](https://threejs.org/docs/pages/WebGLRenderer.html).
