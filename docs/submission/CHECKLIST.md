# Submission handoff

The team should complete the following items before it submits Huddle. The [official rules](https://amazonappdev2026.devpost.com/rules) set the deadline at October 23, 2026, 2:00 p.m. America/Chicago.

- [x] The team confirms the merge of [PR #5](https://github.com/anakavtaradze/Huddle/pull/5) and verifies the combined app.
- [x] The team merges the root MIT license and submission documentation into `main` through [PR #6](https://github.com/anakavtaradze/Huddle/pull/6).
- [x] GitHub detects the MIT license on the public repository.
- [x] The team records the merged baseline and the completed checks in the [validation report](VALIDATION.md).
- [ ] The team merges the tested Escape-key fix and this final validation record before submission.
- [ ] The team records the Vega app walkthrough and adds its public YouTube or Vimeo URL to Devpost.
- [ ] The team pastes the [project story](DEVPOST.md) and confirmed [product feedback](PRODUCT_FEEDBACK.md) into Devpost.
- [ ] The team selects the Fire TV track and AWS Builder mini challenge.
- [ ] The team verifies its team-member details and submits its entry.

## Final references

| Item | Value |
| --- | --- |
| Repository | https://github.com/anakavtaradze/Huddle |
| Primary track | Fire TV through Vega OS |
| Mini challenge | AWS Builder through Amazon Bedrock |
| Validated baseline | `c750b0ccadca769b07c21cd43071a0928163e490` plus the Escape-key fix in this branch. |
| Demo URL | The team adds the video URL after upload. |
| Devpost URL | The team adds the project URL after submission. |

The Open Source mini challenge requires an additional qualifying project or contribution alongside the primary-track entry. The repository's MIT license satisfies the public-repository licensing step; the license alone does not establish that mini-challenge entry. The team should select that challenge only if it supplies the separate contribution details.

## Verification record

The validation used the merged `main` commit `c750b0ccadca769b07c21cd43071a0928163e490` and the browser Escape-key fix on October 23, 2026. The [validation report](VALIDATION.md) records the tested flows and remaining recording tasks.

| Check | Status |
| --- | --- |
| `npm ci` and browser dependency installation | The locked dependency installations passed. |
| `npm test` | All 47 unit and service tests passed. |
| `npm run check:web` | The TypeScript check and production web build passed. |
| `npm run test:e2e` | All five browser tests passed, including the new focused-input Escape regression test. |
| AI startup through `npm run ai:server` | A health-only check confirmed that the command loads the port, region, and model ID from `.env`. |
| Root MIT license | The file matched GitHub's canonical MIT text after copyright substitution. |
| Documentation links | All local Markdown targets resolved. |
| `npm run vega:build` | The release build passed and produced an arm64 Vega package. |
| Final Vega remote walkthrough | The installed release passed navigation and live AI checks on the Vega Virtual Device. |
| Live `npm run ai:check` | The live Bedrock check returned a valid Amazon Nova 2 Lite response. |
| TV-to-phone food invitation and status update | The native TV host and two phone-sized browser sessions passed QR decoding, LAN access, independent status updates, host-edit resets, and phone reload restoration. The team still needs a physical-phone scan during recording. |

## Existing dependency advisory

The fresh browser dependency installation reported one high-severity advisory for `image-size@1.2.1` through React Native's development dependency tree. The advisory concerns denial of service during image metadata parsing ([JXL/HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq), [ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr)). This submission package retains the existing dependency versions. The root service dependency audit reported no vulnerabilities during installation.

The native SDK dependency installation also reported 27 existing advisories (14 moderate and 13 high). This validation retains the SDK template's locked versions.
