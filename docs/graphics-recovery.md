# Adaptive graphics and recovery

The game starts at its highest quality preset on desktop and mobile. It no longer demotes devices based on touch input, a mobile user agent, reported memory, or the legacy `townies-light-graphics` flag. There is no browser API that reliably identifies the highest sustainable graphics quality before running the scene, so the game measures foreground frame pacing and adjusts during play.

## Quality levels

| Level    | Resolution cap                   | Render-pixel budget | Shadows |
| -------- | -------------------------------- | ------------------- | ------- |
| High     | 2× device-independent resolution | 3 million           | On      |
| Balanced | 2×                               | 2 million           | Off     |
| Light    | 1.5×                             | 1.5 million         | Off     |
| Low      | 1×                               | 1 million           | Off     |

Actual resolution also respects device pixel ratio and WebGL texture/viewport limits. The first downgrade removes shadow rendering and releases its targets while preserving phone sharpness. Lower resolutions are used only when poor performance persists. Quality changes resize the existing framebuffer and update materials without rebuilding the town, camera, player, or connection. Context antialiasing is immutable: high startup requests it, while a context created by the compatibility fallback retains its no-antialiasing setting even if quality later rises.

`AdaptiveGraphics` ignores the initial eight seconds, background tabs, long sleep/resume gaps, and the first eight seconds after resizing or a quality change. Two consecutive two-second windows averaging more than 36 ms per frame (below about 28 FPS) lower quality by one step. A stable 30 FPS phone power-saving cap does not by itself reduce quality. An isolated stutter does not meet the sustained-slowdown threshold.

Quality increases one step after at least 30 seconds of steady headroom (average frame time below 18.5 ms), with at least 90 seconds since a downgrade or recovery. Further upward probes wait at least 30 seconds. A failed upward probe downgrades again and restarts the longer cooldown, limiting oscillation. Performance is affected by CPU load and browser scheduling as well as GPU load; this is a conservative pacing heuristic, not a GPU benchmark. It cannot guarantee a frame rate.

The chosen level carries through scene rebuilds and room transitions within the page session. A fresh page starts high except after a graphics failure recorded in the last 15 minutes: that device starts Balanced/default-power for recovery, then can gradually probe higher quality. This timestamp replaces the previous permanent low-quality flag. Ordinary frame-rate adjustments are not stored permanently.

## Context startup and loss

`townRenderer.ts` owns renderer creation, quality, framebuffer sizing, and context release for both outdoor and indoor views. High-quality startup first requests an antialiased context, then tries a default-power context without antialiasing if creation fails. Already-lost or missing contexts are rejected, and failed attempts release any context allocated. Three r186 requires WebGL 2; unavailable or blocked WebGL 2 cannot be solved by a lower preset.

Outdoor startup has two delayed retries (800 ms, then 1,600 ms). Permanent failure ends in a recovery panel; manual retry starts a new bounded sequence. Cleanup cancels pending timers. Context loss stops outdoor movement and detaches its API. Native restoration returns at Balanced or the current lower quality. If restoration does not occur within 2.5 seconds, the outdoor scene makes one automatic restart per mount/manual retry. A further loss waits for native restoration or explicit retry, avoiding endless restarts. Interior simulation pauses while its context is lost and native restoration applies the same conservative quality policy.

Both renderers isolate the imperative canvas from React error content and explicitly release graphics contexts on unmount. Shadow targets and scene resources are disposed. The login page uses `public/town-welcome.jpg` instead of creating a second decorative WebGL town; it remains usable without WebGL.

The outdoor error panel includes selectable browser, viewport and context-creation details. They contain no account credentials or town data and are not automatically transmitted.

## Verification

- `node tests/adaptive-graphics.mjs`: deterministic pacing scenarios for startup warm-up, gradual downgrades, minimum quality, upward recovery/cooldowns, hidden tabs, steady 30 FPS, isolated stutters, and context recovery.
- `node tests/graphics-browser.mjs`: actual WebGL factory fallback, bounded startup failure and delayed success, context loss/restoration/restart, teardown, zero-context login, high-quality phone defaults despite the old flag, orientation/large-screen sizing, and quality adjustments without context replacement.
- `node tests/camera-browser.mjs`: camera continuity, scenery rebuilds, and automatic graphics recovery.

Browser checks run headless Chromium with software graphics and the GPU blocklist bypassed. Touch emulation is not a physical-phone or social-app-browser test; specific driver behavior remains unverified. Initial user reports were context-creation failures before town geometry was constructed. Without affected-device diagnostics, no single cause is established for all reports.

## Maintenance-job regression investigation

A player reported Chrome failing while Safari still worked on the same computer, with the change noticed after maintenance jobs were added. The diagnostic remains a WebGL 2 context-creation refusal; it does not establish whether an earlier session exhausted resources or Chrome disabled graphics for another reason. Safari success is not sufficient to exclude an application-triggered Chrome issue.

Review found two concrete issues:

- Maintenance scenery rewrote and uploaded all six instance-matrix buffers every 250 ms when idle. It now updates only when relevant completion state changes, an active action needs animation, an action starts/stops, or the earliest 24-hour reset expires. Reordered rows and unrelated profession completions do not trigger maintenance uploads.
- Outdoor peer removal detached the avatar without disposing its geometry or private equipment materials. `releaseAvatar` releases those allocations on departure, preserving palette materials shared with scenery and other players. This removal gap predates the new jobs; adding their equipment increases the resources affected.

Verification: `node tests/maintenance-scene.mjs` checks idle buffer versions, immediate action/cancellation updates, animations, completion and 24-hour resets. `node tests/avatar-resources.mjs` checks private-resource disposal and shared-material preservation. The real-scene camera browser test checks repeated peer departures across all four new professions and verifies every attached geometry receives disposal.

These are confirmed resource-management fixes, not confirmation of the affected Chrome's failure cause. A fresh Chrome restart and its `chrome://gpu` report are still useful to distinguish a lingering GPU failure from reproducible game-triggered pressure. Google documents that browsers may disable WebGL after instability: https://support.google.com/meet/answer/9302964.
