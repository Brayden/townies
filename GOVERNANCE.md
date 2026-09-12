# Project governance

Townies is maintainer-led open source. Brayden Wilmoth (`@Brayden`) is the project owner, initial maintainer, and release authority. Community participation does not confer repository write access or control over the official service.

## Decisions

Anyone may propose a change. Maintainers decide product direction, approve contributions, manage compatibility, and choose release timing. Larger or contentious changes should begin as an issue describing alternatives and player impact. Final decisions and their reasons should be recorded publicly unless they concern a private security report or player data.

## Merge authority

The default branch requires PRs, checks, resolved conversations, and code-owner review. CODEOWNERS includes the complete repository, including itself and release configuration. Only the owner has administrative bypass authority. With one maintainer, the owner may use the explicitly configured PR-only bypass for their own reviewed/tested PRs; it is not permission for contributors to bypass review. Such uses remain visible in the PR history. Add another trusted maintainer before requiring independent approval for every owner-authored change.

Outside contributors use forks. Do not give write or administrative access merely to enable a contribution. Maintainer additions and changes to rules, secrets, or release authority require the owner's decision.

## Release authority

Merge and release are separate decisions. Official releases are manually dispatched for a reviewed commit on `main`, pass through the protected deployment environment, and use credentials unavailable to PR checks. Release tags are owner-controlled. No fork PR is deployed to production automatically.

Only the owner may approve the initial production environment. Self-approval is permitted for an owner-dispatched release because this project currently has one release maintainer; production is still never approved by outside contributors. Revisit this once a second release maintainer is appointed.

Community forks are independently governed and must follow the license and trademark policy. Their actions are not official Townies releases.
