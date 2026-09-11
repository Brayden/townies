# Chat unread badges

The HUD badge totals unread messages in town chat and the resident's current profession channel, excluding their own messages. Opening one channel clears only that channel after messages load successfully while the page is visible. Counts above 99 display as `99+`.

Read progress is persisted in `chat_read_positions`, keyed by town, authenticated resident, and channel. Account login resolves to the same resident across devices and sessions. Each town's Durable Object owns these records alongside its messages; normal gameplay does not write read receipts to shared D1. Read positions remain with their town when a resident moves away, and can be used if they return.

A cursor contains the latest read message timestamp plus IDs at that timestamp, preserving unread arrivals in the same millisecond. The server validates the boundary against the resident's authorized channel. An atomic upsert advances the timestamp or unions same-timestamp IDs; older devices cannot rewind progress. Unchanged acknowledgments do not write or send notifications. A read notification goes only to the same resident's connected devices. Other residents do not receive read receipts.

The authenticated `/api/chat` POST accepts `action: "read"`, `townId`, `channel`, and `read: { created, ids }`. The server derives resident identity from the session. GET with `summary=1` returns `{ unread, read }` from durable storage. Legacy `after`/`seen` query cursors are still accepted and merged for older clients. Membership, profession, and origin checks also apply to acknowledgments.

The browser retains `townies-chat-read-v1:*` as a cache and retry queue. Existing read progress uploads when that browser next opens the game. A new device loads the server cursor without needing local storage. Reads during a failed connection retry on chat notifications, visibility changes, or periodic refresh. Cursor checks discard stale count responses when a newer local read occurs. If a prior browser never saved or uploads no read history, previously read messages cannot be reconstructed; opening the conversation establishes the shared position.

Migration `0019_huge_warbird.sql` adds only the new table. It is applied to shared D1 for the legacy path and included explicitly in the per-town migration list (account-only migrations 0016–0018 remain excluded). Existing town DOs apply it on next initialization; new DOs include any legacy read records in the one-time import.

Validation:

- `node tests/chat-unread.mjs`: actual handler against isolated SQLite; persisted new-device/new-login counts, account/channel/town isolation, future/invalid boundaries, same-time arrivals, monotonic merging, and moderation.
- `node tests/chat-read-sync.mjs`: actual React hook and handler with independent browser storage; live synchronization, logout/remount, retries, stale-response races, and no write loops.
- `tests/town-websockets.mjs`: real local Worker and town DO; read persistence over HTTP and WebSockets, private cross-device notifications, and existing multiplayer regression checks.
