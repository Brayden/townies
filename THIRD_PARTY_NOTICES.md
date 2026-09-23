# Third-party software notices

Townies uses third-party packages under their respective licenses. The project license does not replace those licenses. `package-lock.json` pins the dependency tree.

Run `npm run licenses` after installing dependencies or changing the lockfile. It generates `public/third-party-licenses.txt` with package identities and the installed license/notice files for production dependencies. This file is included in the web build and available at `/third-party-licenses.txt`. The generator fails if it cannot find license text, so missing notices require review rather than an assumed license.

Major components include React (MIT), Three.js (MIT), Better Auth (MIT), Drizzle ORM (Apache-2.0), Lucide (ISC), and Tailwind CSS (MIT). Consult the generated notices for the resolved versions, complete texts and additional dependencies. Development tools retain their upstream licenses and are not relicensed by this repository.

Project-owned assets and reserved branding are described separately in ASSETS.md and TRADEMARKS.md.

## Notice provenance and exceptions

The inventory excludes optional platform-specific build binaries and development-only packages; those tools retain the licenses shipped by their publishers. Vendored license files within runtime packages are included. Missing root notices are supplemented by version-scoped entries in `scripts/license-overrides.json`, with upstream source/blob provenance in `third-party/licenses/sources.json`.

`css-box-shadow`, `stackback`, `unpic`, and `@unpic/core` declare MIT in their npm metadata but omit a full license/copyright notice. Their notices explicitly record that limitation and reproduce the standard MIT terms without inventing copyright ownership. `drizzle-kit` declares MIT in package metadata while its current source repository supplies Apache-2.0; the repository text is retained and this discrepancy is not silently resolved. These upstream packaging issues should be clarified before redistributing standalone copies of those packages. They do not change the license of Townies-owned code.
