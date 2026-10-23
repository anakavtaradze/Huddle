# Submission handoff

The team should complete the following items before it submits Huddle. The [official rules](https://amazonappdev2026.devpost.com/rules) set the deadline at October 23, 2026, 2:00 p.m. America/Chicago.

- [ ] The team confirms the merge of [PR #5](https://github.com/anakavtaradze/Huddle/pull/5) and verifies the combined app.
- [ ] The team merges the root MIT license and submission documentation into `main`.
- [ ] GitHub displays the MIT license in the public repository's About section.
- [ ] The team runs the [judge guide](JUDGE_GUIDE.md) against the final commit and records that commit SHA below.
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
| Final commit | The team records the merged commit SHA here. |
| Demo URL | The team adds the video URL after upload. |
| Devpost URL | The team adds the project URL after submission. |

The Open Source mini challenge requires an additional qualifying project or contribution alongside the primary-track entry. The repository's MIT license satisfies the public-repository licensing step; the license alone does not establish that mini-challenge entry. The team should select that challenge only if it supplies the separate contribution details.

## Verification record

The local submission branch includes Bedrock PR head `ce7e1ca83530b3b29e0b80792ada47fdcdc4d52f` and the submission packaging changes. The checks below ran on that combined source on October 23, 2026. The team should confirm the final merge commit and complete the device and live-service checks during recording.

| Check | Status |
| --- | --- |
| `npm ci` and browser dependency installation | The locked dependency installations passed. |
| `npm test` | All 47 unit and service tests passed. |
| `npm run check:web` | The TypeScript check and production web build passed. |
| `npm run test:e2e` | All four browser tests passed, including the AI/learning/food integration check and independent food-party sessions. |
| AI startup through `npm run ai:server` | A health-only check confirmed that the command loads the port, region, and model ID from `.env`. |
| Root MIT license | The file matched GitHub's canonical MIT text after copyright substitution. |
| Documentation links | All local Markdown targets resolved. |
| `npm run vega:build` | The team must verify the final device build; this packaging run did not rebuild the native app. |
| Final Vega remote walkthrough | The team must verify the final app during recording. |
| Live `npm run ai:check` | The team must verify a live Bedrock response before recording; the packaging checks invoked no paid model calls. |
| TV-to-phone food invitation and status update | Browser automation passed; the team must verify its physical phone's network connection during recording. |

## Existing dependency advisory

The fresh browser dependency installation reported one high-severity advisory for `image-size@1.2.1` through React Native's development dependency tree. The advisory concerns denial of service during image metadata parsing ([JXL/HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq), [ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr)). This submission package retains the existing dependency versions. The root service dependency audit reported no vulnerabilities during installation.
