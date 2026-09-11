# Game audio

Settings → Sound & music has independent music/effects switches and volume sliders. Both switches default off. Preferences are local to the device/browser (`townies-audio-v1`); storage failures do not prevent playback, and open tabs receive preference changes. Nothing is written to town or resident storage.

`app/game/audio.ts` owns a single Web Audio mixer for the mounted game. `useGameAudio.ts` loads preferences after hydration and handles user gestures, visibility, and teardown. Audio is enabled only inside a joined, active game. Loading music is deferred until an opted-in player interacts. It loops from an AudioBuffer, pauses at the current position while hidden or muted, and resumes without overlapping sources. Disabling effects stops pending effects. An unavailable music file offers an explicit retry in Settings. No audio starts on the login screen.

`Daylight in Townies` is an original synthesized composition based on the social trailer's score: the same chords, plucked harmonics, bass, and light percussion, arranged as a 54-second loop with a gentle melodic variation. `scripts/make-soundtrack.py` produces a stereo WAV with wrapped note tails and no baked-in delivery accents. Encode that WAV with LAME at 160 kbps to `public/audio/townies-daylight-v1.mp3`. The asset is about 1 MB and decoded only when enabled. Bump the filename when replacing its contents. This music and the synthesized effects contain no third-party samples or licensed tracks.

Paper sounds use TownScene's existing release/impact callbacks, including reduced-motion delivery. The throw gets a soft noise swoosh; the door gets a quiet tap. The trailer-style high pluck plays only after landing and server confirmation. Other successful actions keep their reward chime, routed through the same effects volume. Effects never appear in the music loop, so players hear them only when triggered by gameplay.

Validation: `node tests/game-audio.mjs` covers opt-in/lazy loading, independent channels, visibility pause/resume and playhead retention, late-download mute/dispose races, source cleanup, and retry after load failure. Typecheck and the Cloudflare production build also pass. Real-device Safari/Android listening and interruption testing remains useful before a broad release.

Browser references: [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices), [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
