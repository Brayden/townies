# Moving between towns

Open **Town → Move to another town**, or open **Settings → Towns**.
The browser loads public towns automatically, oldest first. Each card shows:

- Current residents out of 50, plus remaining spots. Full towns cannot be selected.
- Distinct current residents active in the last 72 hours, including offline residents.
- Players online now (the existing 12-second presence window).
- Age since the town was created; the age text also has the founding date as a tooltip.

Refresh updates availability. Previous/Next browse a card grid without growing the menu.
Small or short screens show fewer cards per page. Vacant addresses are also paged. The Invite code view finds private towns, which are excluded from public listings.
Select a town, choose a vacant address, then review and confirm the move. Capacity
and address ownership are checked again by the destination town during transfer;
viewing a listing does not reserve a place. Existing progression and transfer
recovery rules are unchanged.

## Storage and rollout

`0020_town_activity.sql` adds `residents.last_active` to shared D1 and town SQLite.
It is explicitly included in the town migration allowlist. Apply shared migrations
before deploying the new Worker, as with the existing release process. Each town
DO applies the migration when initialized. No new environment variables are needed.

Presence updates maintain `last_active` through SQLite triggers. Disconnecting
still clears `seen` so online counts remain accurate, but does not erase activity.
Activity is a rolling 72-hour window and counts residents, not sessions or devices.
Residents who moved away are excluded. This measures game presence, rather than
only credential sign-ins, so returning with an existing session also counts.

Existing saves backfill activity from the latest retained `seen`, `move_updated`,
or account creation timestamp. Some older offline sessions had their only presence
evidence erased; those cannot be reconstructed and may initially be undercounted.
New presence updates retain activity reliably.

D1 supplies a keyset-paginated list of public town IDs (12 per page). Each town DO
supplies its own live metrics; stale D1 presence/occupancy does not decide those
counts or hide full towns. Raw resident records, invitation keys, and home lists
are not included in public listings. The legacy D1 game path uses the same summary
and pagination helpers.

## Verification

`tests/town-directory.mjs` covers backfill, disconnects, the 72-hour boundary,
isolation, cursor validation, pagination, and age formatting. `tests/moving.mjs`
checks transfer rules. `tests/town-objects.mjs` verifies DO metrics against stale
D1 values and private-town exclusion in the isolated integration suite.
`tests/move-town-browser.mjs` covers mobile/desktop cards, full towns, invitation
codes, address selection, confirmation, pagination, loading failures, and empty
lists. Run it through `npm run test:browser`.
