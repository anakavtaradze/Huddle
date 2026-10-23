# Final validation record

The validation checked merged `main` commit `c750b0ccadca769b07c21cd43071a0928163e490` on October 23, 2026. That commit includes the Bedrock integration in PR #5 and the license and submission package in PR #6. The browser checks also include this branch's Escape-key fix.

| Check | Observed result |
| --- | --- |
| Unit and service suite | All 47 tests passed. |
| Web TypeScript and production build | Both checks passed. |
| Playwright suite | All five tests passed. |
| Additional browser walkthrough | All six navigation tabs rendered; six movie ratings survived reload and preserved profile isolation; plans supported movie and game additions, tonight selection, and vote toggles. |
| Nickname editing and Back | The browser saved nickname edits, cancelled unsaved edits with Escape, and returned from the room to its entry screen. |
| Live Bedrock | The health check, web app, and native app received real Amazon Nova 2 Lite responses through the local AI service. The browser retained canonical movie metadata and cleared stale ideas after a time-constraint change. |
| Vega release | The native TypeScript check and arm64 release build passed. The installed release launched on the Vega Virtual Device. |
| Native remote walkthrough | D-pad navigation reached Home, Movies, Games, Friends, Room, Plans, and Food. Back returned from Room to Friends. The native room displayed a live Bedrock recommendation. |
| Food service persistence | The native host retained its party and published shopping list across a service restart. |
| Native TV and phone browsers | Two independent phone-sized browser contexts joined the native host's party over the LAN invitation. QR decoding matched the invitation URL. Each phone reported its own status, and the TV displayed those statuses. |
| Shopping-list revision | A native host edit reset both phone statuses. A phone retained its session after reload, and both phones subsequently reported ready statuses to the service. |
| Public repository and license | GitHub reported PUBLIC visibility and detected the root license as MIT. |

The walkthrough found one browser bug: a focused React Native Web nickname input consumed the Escape key before the window listener received it. This branch moves the listener to the capture phase and adds a regression test for cancellation, saving, and room Back navigation.

The phone checks used separate browser contexts with phone-sized viewports. The team still needs a physical-phone QR scan during demo recording. The checks intercepted a fixture Amazon product link and verified its destination and isolated opener; the checks placed no Amazon order. The prototype provides planning and coordination, so this validation makes no claim about movie streaming, checkout, or delivery. The browser checks verified rating persistence; this walkthrough did not separately verify native rating persistence across an app restart.

The team still needs to upload its demo video, add the video URL to Devpost, complete the submission fields, and submit the entry. These repository changes do not modify the Devpost form. The [submission checklist](CHECKLIST.md) records the remaining handoff steps and existing dependency advisories.
