# Chat unread badges

The HUD badge totals unread messages in town chat and the resident's current profession channel, excluding their own messages. The channel tabs show separate counts. Opening one channel clears only that channel after its messages load successfully while the page is visible. Counts above 99 display as `99+`.

Read positions are saved per browser, resident, town, and channel in `townies-chat-read-v1:*`. They survive refresh and synchronize across tabs in the same browser; they do not synchronize across devices. A first visit treats existing messages as unread until that conversation is opened. Read cursors include the IDs at the final timestamp so a new message arriving in the same millisecond is not accidentally marked read.

The existing authenticated `/api/chat` GET supports `summary=1`, returning only an unread count from the town's storage. It applies the same membership and profession checks as message loading. No schema change or shared D1 writes are needed. WebSocket notifications refresh the badge, visibility/reconnect restores missed counts, and HTTP fallback polls while disconnected. A read occurring during a pending count request invalidates that result and triggers another count, preventing old responses from restoring a cleared badge.

`node tests/chat-unread.mjs` exercises the actual chat handler against isolated in-memory SQLite, including own-message exclusion, authorization, same-timestamp arrivals, and cursor merging.
