# Devpost submission copy

The team can paste the project story below into Devpost after PR #5 merges. The story covers the movie planner, persistent preference learning, Eat Together, and the live Bedrock integration in [PR #5](https://github.com/anakavtaradze/Huddle/pull/5).

## Project name

Huddle

## Tagline

Huddle helps friends choose a movie, plan games, and share a food night from the TV.

## Primary track

Fire TV — Vega OS

## Mini challenge

AWS Builder — Amazon Bedrock

## Repository

[Huddle on GitHub](https://github.com/anakavtaradze/Huddle)

## Project story

### Inspiration

Friends bring different tastes, schedules, and food preferences to movie night. A group can spend its evening negotiating those choices before anyone starts the movie. We built Huddle around a shared TV experience that helps the group make a plan and keeps each person's constraints visible.

### What it does

Huddle brings movie selection, after-movie game planning, and food coordination into a Vega OS app. Friends can edit their demo profiles, mark their attendance, set their available time, and vote on the evening's activities. Group Pick filters the sample movie catalog against everyone's time budget and ranks the remaining choices by the least-satisfied person's taste score before the group average. Huddle explains the shared preferences and remaining tradeoffs behind its recommendation.

Each profile can rate catalog movies. Huddle saves those ratings and learned genre weights on the current device and restores them after a restart. A small learning harness proposes bounded weight updates after six distinct ratings and accepts an update only when it improves its held-out prediction score. This local experiment adjusts catalog rankings without overriding the time filter or the least-satisfied person's explicit taste score.

The AI button requests additional real-film ideas through Amazon Bedrock. The server calls Nova 2 Lite through the Converse API, and the app constrains the results to a curated candidate list. The app preserves the listed runtimes and genres and rejects duplicates, disliked genres, and choices that exceed the group's time budget.

Eat Together gives the host a shared food list and a QR invitation. Guests join the party on their phones, open the same Amazon product links, complete their own checkout, and report their food status. The TV shows the synchronized statuses. The service preserves food parties across restarts, and a host's list changes require everyone to review the updated selection.

### How we built it

We built the screens with React Native and TypeScript. The Vega application uses Amazon's SDK, TV focus guides, remote Back handling, and AsyncStorage. A React Native Web preview supports browser development and the phone companion. Platform adapters connect the shared screens to the appropriate image, storage, focus, and service APIs.

The Node.js AI service keeps AWS credentials on the server and calls Amazon Bedrock through the AWS SDK. The Node.js food service provides invitation links, QR codes, participant sessions, host-only list editing, and atomic JSON-file storage. The test suite covers recommendation constraints, learning persistence, navigation, source synchronization, and the service boundaries. Playwright tests exercise separate phone sessions and QR invitations.

### Challenges we addressed

The TV remote and the browser required different focus and Back behavior. We placed those behaviors behind platform adapters and kept the shared screens in one source directory. Food invitations required a reachable phone address, so the service exposes an explicit public-origin setting. The learning store required careful restoration and save ordering, so the app validates saved records and presents retry controls for storage errors. AI output required additional checks, so the app validates model choices against its candidate metadata and group constraints.

### Accomplishments

We connected a TV planning experience to a phone checkout flow while keeping each participant's purchasing details with Amazon. We combined an explainable group ranking with persistent local feedback and a separate live Bedrock recommendation path. We also built automated checks for the behaviors that connect the TV, browser, storage, and services.

### What we learned

We learned the value of explicit platform boundaries for a shared React Native interface. We also learned the value of validating model output and testing cross-device invitations with independent browser sessions. The learning harness gave us a way to inspect proposed preference updates, while its small validation set kept our quality claims limited to a prediction proxy.

### What's next

We would add authenticated movie rooms, shared movie-plan synchronization, and authorized playback integrations. We would also evaluate recommendation quality with real users and replace the demonstration food service's single-file storage with a hosted service for broader use.

### Prototype scope

The movie experience uses sample catalog data and simulated friends, rooms, votes, and game launches. The prototype provides no streaming or synchronized playback. The profile switcher provides demo identities rather than account authentication. Movie feedback stays on each device. Eat Together synchronizes a separate food party and uses participant-reported statuses rather than Amazon order or delivery tracking. Amazon handles each guest's checkout, and local availability can prevent an exact food match.

## Built with

Amazon Vega SDK, React Native, TypeScript, React Native Web, Vite, Node.js, Amazon Bedrock Converse, Amazon Nova 2 Lite, AWS SDK for JavaScript, AsyncStorage, QRCode, Playwright, GitHub Actions.

## Remaining form inputs

The team must add its public YouTube or Vimeo demo URL and its team-member details to Devpost. The team can paste the [product feedback draft](PRODUCT_FEEDBACK.md) into the feedback field after confirming its firsthand observations. The team can use the [judge guide](JUDGE_GUIDE.md) for testing instructions.
