# Security policy

Report suspected vulnerabilities privately at https://github.com/Brayden/townies/security/advisories/new. Do not post exploit details, credentials, account identifiers, private messages, or player data in public issues.

Include affected code/version, impact, reproduction steps against a local disposable town, and any suggested mitigation. Do not test exploits against the live service or other players. We aim to acknowledge reports within seven days, but cannot promise a fixed resolution date.

The current default branch and official deployed release are maintained. Older versions and independent forks do not have guaranteed security support.

Important boundaries include account/session verification, passkeys, cross-town access, private chats and home visits, server-authoritative rewards, movement ownership, WebSocket grants, and migrations. Local integration fixtures are not production authentication mechanisms.

Never upload production backups or secrets to a PR or issue. If a credential is exposed, revoke/rotate it; deleting it from the latest commit alone is insufficient. Coordinate any history cleanup with the maintainer.
