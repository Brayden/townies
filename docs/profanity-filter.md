# Profanity checks

New town/profession messages, friend DMs, account display-name creation/updates, character joins, and private town names are checked on the server. Flagged submissions return a friendly validation error before storage or broadcast; message drafts remain editable. Both the Durable Object join path and the legacy game join path validate names before creating a town or resident. Existing accounts, names, and message history are not rewritten or deleted by this change.

`server/profanity.ts` uses the pinned `obscenity` English preset and its confusable, leetspeak, case, and repeated-character handling. It additionally normalizes Unicode, strips invisible format/combining characters, joins punctuation within words, and recognizes single-letter spelling with spaces. Ordinary spaces between words remain intact to avoid mistakes such as interpreting “push it” as profanity. A small whole-word exception list covers legitimate names that the preset flags; an exception never exempts other text around it.

This is a deterministic English-language filter, not comprehensive multilingual moderation or harassment detection. Evasions and false positives will still need review as usage grows. Adjust the centralized matcher/exception list and add regression cases when that happens. Filtering is mandatory rather than a player setting. Passwords, email addresses, invite keys, and game item identifiers are not filtered.

Checks: `node tests/profanity.mjs` covers common evasions, ordinary names and gameplay language, identity statements, DM rejection before writes, and Better Auth's create/update name hooks. `node tests/chat-unread.mjs` also verifies that town and profession messages are rejected by their shared HTTP/WebSocket handler without being saved. No tests send messages to real players.

Library source and documentation: [Obscenity](https://github.com/jo3-l/obscenity), MIT licensed, pinned in the package lock.
