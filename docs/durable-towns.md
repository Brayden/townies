# Durable towns

The standalone Cloudflare deployment names exactly one `Town` Durable Object by each town's immutable ID. Each owns its own SQLite database. Residents, homes/interiors, work claims, grass timestamps, economy, elections, construction, pets, chat, and communal activities execute there. The existing validated gameplay SQL runs through a prepared-statement adapter; batches use synchronous SQLite transactions, including `changes()`-guarded rewards. Requests within a town are serialized across awaits.

A smaller `ResidentCoordinator` object, named by the hash of the account identity, stores its current membership, session grants, and transfer journal. It coordinates sessions and relocation, not world simulation. This lets two towns operate independently and prevents two devices from creating duplicate memberships or spending during a transfer.

## Shared D1 boundary

D1 retains accounts/authentication, town discovery/invite codes, resident directory profiles, cross-town friendships, and direct messages. It no longer owns active town simulation. A town periodically refreshes limited social profile fields, at most once a minute while active, using a durable alarm. It does not copy movement, grass, coins, construction, or world state back into D1. Social panels still query the shared friendship/message tables; this is a remaining shared service to measure under beta load.

A server-signed HttpOnly routing cookie binds account identity, the existing auth-session cookie hash, and an expiry of at most one day. Initial establishment/renewal verifies Better Auth's D1 session. Ordinary game requests verify the signature and consult the resident object's persistent session grant without a D1 session or membership lookup. Logout revokes that grant before revoking Better Auth's session, including for previously copied routing cookies. Account session-management endpoints also invalidate grants. Browser-supplied dispatcher headers are never accepted on the standalone host. Missing object bindings fail closed rather than silently resuming D1 gameplay writes.

The transport remains HTTP polling in this change. WebSocket broadcasts, delta snapshots, and production-scale load tests remain separate work. Per-town storage removes the shared gameplay database bottleneck; it does not itself prove a particular player-count, latency, or cost target.

## Migration

On first access, the town imports a consistent D1 batch snapshot into a local transaction, including referenced former residents needed for history. A durable marker prevents reimport after restart. Existing timestamps and IDs are retained. No games are reset and no existing town is merged with another.

Town SQLite applies the published game migrations 0000–0015. Authentication migration 0016 stays in D1. D1 migration 0017 removes the old directory-level home uniqueness constraint; the same constraint remains in each town's authoritative SQLite database. This permits temporarily stale directory profiles without weakening actual house ownership. Append future town migrations to the explicit migration list/version filter in `server/towns/schema.ts`; do not edit applied migrations. Directory/auth migrations must not be applied to town SQLite.

The former Sites deployment is separate and unchanged. This checkout defaults to standalone Cloudflare now. Do not publish the new D1 directory migration to a legacy Sites/D1-only runtime.

Initial production cutover must pause gameplay on the new Worker using `TOWNIES_MAINTENANCE=true`, let old requests drain, export a private D1 backup, apply 0017, and then deploy with maintenance false. Accounts remain available during the pause. The old D1 town rows are retained as migration input and historical backup; they cease to be a current world backup after cutover. Never roll back to the old D1-writing Worker without a coordinated export from the town objects.

## Cross-town handoff

1. Persist intent in the resident coordinator before contacting either town.
2. Freeze the source resident and capture their complete saved record.
3. Reserve capacity and the chosen home atomically in the destination. A reserved incoming resident cannot act yet.
4. Update the shared membership directory, depart the source, and activate the destination using the same transfer ID.
5. Persist the new membership and finish the journal.

Every stage is idempotent. A subsequent request resumes a pending transfer; ambiguous transport failures retain intent instead of assuming failure. Definitive full-town, occupied-home, or invalid-code failures release the source freeze. Old-town packets are rejected after the move. Source elections, contributions, and history remain in that town; belongings and personal progress travel with the resident. Frozen records are excluded from monthly upkeep until the handoff completes, then ordinary upkeep resumes. No account is allowed to play in both towns during recovery.

## Validation

- `tests/accounts-api.mjs`: signup/login, cookie gates, private invitations, ownership, forged headers, cross-origin protection, logout/revocation, persistence.
- `tests/town-objects.mjs`: separate town databases, simultaneous home claims, D1 no longer authoritative for world balances, shared mowing rewards, 24-hour grass timing, device takeover, failed destination reservation, deliberately interrupted transfer, simultaneous opposite transfers, stale packets, friends/DMs, capacity of 50, overlapping requests, and revoked session replay.
- `tests/town-migration.mjs`: existing town import with exact balances, home, career, grass timestamps, treasury, historical foreign references, and prevention of repeated imports. It saves a private local fixture for restart verification.

These tests create only disposable local worlds and refuse remote URLs. Their controlled database edits must never be pointed at production. Production deployment is additionally checked for successful object bindings and authenticated request routing; broader load testing is still required before an open beta.

## Initial production cutover record

Deployed on September 11, 2026 (UTC), after a maintenance pause and private pre-cutover backup. D1 migration 0017 completed successfully. Live checks created two isolated private towns and verified home setup, a cross-town transfer, shared destination membership, and returning login. Their accounts and directory records were removed afterward; dormant test object storage is not listed as a playable town and is retained until a future administrative storage cleanup. No existing player or town was deleted. The private local backup is in the ignored `outputs/backups` directory with restricted file permissions.

This release uses the existing polling transport. Next scaling validation should measure 50 simultaneous players per town across multiple towns, then prioritize delta updates/WebSockets and the remaining shared social reads based on measurements.
