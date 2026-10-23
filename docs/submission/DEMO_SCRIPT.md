# Demo recording script

The team can record a 2 minute 45 second walkthrough with the following sequence. The recording must show the actual Huddle app inside the Vega Virtual Device or on a Fire TV device. The phone segment can show the companion beside the TV capture.

## Recording preparation

You should use the final merged code and follow the [judge guide](JUDGE_GUIDE.md) before recording. You should start both services, configure a phone-reachable food origin, and connect the simulator's reverse ports. You should keep the simulator window and remote visible enough to establish the target platform. You should prepare a food party with a valid product link and a guest phone session. You should verify one live AI request before recording.

You can use the existing demo profiles, which include attendees with at least 120 minutes and candidate-compatible preferences. You can prepare six movie ratings to demonstrate storage restoration. You should avoid account screens, personal addresses, credentials, and real purchases in the recording.

## Shot list and narration

| Time | Screen action | Suggested narration |
| --- | --- | --- |
| 0:00–0:15 | The presenter shows Huddle in the Vega Virtual Device and moves focus with the remote. | “Huddle helps friends plan movie night from the TV. The app brings movie choices, game plans, and a shared food list into one place.” |
| 0:15–0:40 | The presenter opens the room, shows Group Pick, and changes one demo profile's available time. | “Group Pick considers everyone's time and tastes. Huddle ranks the remaining movies by the least-satisfied person's fit before the group average, and it explains the tradeoffs.” |
| 0:40–1:00 | The presenter shows a catalog rating and the restored rating count after a prepared restart cut. | “Each profile can rate movies. Huddle saves that feedback on the device and evaluates small genre-weight updates after six distinct ratings. The app accepts an update only when it improves its validation score.” |
| 1:00–1:25 | The presenter presses Get AI ideas and shows the actual response. | “The AI button calls Amazon Bedrock through a local Node service. Nova 2 Lite ranks a curated real-film list and writes the reasons. Huddle validates the titles, runtimes, genres, and group constraints before it shows the results.” |
| 1:25–2:10 | The presenter opens Eat Together on the TV. A phone scans the invitation, opens the shared food selection, and reports an unavailable item. The TV shows the new status. | “The host shares a food selection through this QR invitation. Guests open the same Amazon links on their own phones and use their own checkout. Huddle synchronizes each guest's reported status so the group can coordinate the evening.” |
| 2:10–2:30 | The presenter shows the tonight plan and returns to the room. | “The prototype provides local movie planning and a separate synchronized food party. Amazon handles purchases, and guests report their own order and food status. The movie experience uses demonstration rooms and provides no streaming.” |
| 2:30–2:45 | The presenter shows the repository URL beside the Vega app. | “Huddle combines an explainable group pick, local preference learning, live Bedrock ideas, and a TV-to-phone food flow. The repository provides the source, license, setup instructions, and automated tests.” |

The presenter should show the model response as it actually arrives. The editor can shorten a wait with an obvious cut and preserve the before-and-after interaction. The team should describe learned weights as unchanged if the validation check accepts no candidate.

## Upload

The team should upload the finished video to YouTube or Vimeo and make it publicly visible. The team should paste its URL into Devpost. The repository can link the video after upload; the repository does not need the video file. The [official rules](https://amazonappdev2026.devpost.com/rules) describe the platform and video requirements.
