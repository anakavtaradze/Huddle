# Huddle

Huddle helps friends choose a movie, plan games, and share a food night from the TV. The app combines an explainable group recommendation, persistent movie feedback, and Eat Together food parties through a Vega OS interface and phone companion.

**Prototype status:** This repository reflects the authors' hackathon work on Huddle. Users may still encounter bugs or incomplete features.

Huddle contributors license their original code under the [MIT license](LICENSE). The [third-party notices](THIRD_PARTY_NOTICES.md) describe dependency, template, and asset provenance.

## Quick start and submission materials

The [judge guide](docs/submission/JUDGE_GUIDE.md) provides fresh-clone installation, browser and Vega commands, local service setup, AWS authentication, and phone invitation instructions. The [submission copy](docs/submission/DEVPOST.md), [demo script](docs/submission/DEMO_SCRIPT.md), [product feedback draft](docs/submission/PRODUCT_FEEDBACK.md), and [handoff checklist](docs/submission/CHECKLIST.md) provide the final submission materials. Those materials cover the movie planner, persistent learning, Eat Together, and live Amazon Bedrock recommendations.

You can install the browser and service dependencies and start the preview from the repository root:

```sh
npm ci
npm ci --prefix Huddle-RN-Web-Preview
npm run dev
```

Your browser can open http://127.0.0.1:5173. Separate terminals run `npm run food:server` for food parties and `npm run ai:server` for live AI after you configure AWS access. The judge guide covers the native build and the separate phone companion on port 8788.

## Project structure

Huddle shares its React Native screens between a browser preview and a Vega OS integration. The competition demo targets Amazon's Vega Virtual Device on an Apple Silicon Mac. The browser preview provides a quick UI development loop; the native build produces the Vega package that the virtual device runs.

The repository contains the shared screens, Vega focus/back adapters, and generated native project in `Huddle-Vega`. Vega SDK 0.24.12112 successfully built the aarch64 release package, and the Vega Virtual Device installed and launched the app on this Mac. The current app uses mock movies, games, friends, plans, and movie-room data. The movie experience persists recommendation feedback on the current device. The movie experience does not implement streaming, multiplayer synchronization, or authentication. Eat Together provides a separate synchronized food party with durable storage and capability-based participant sessions.

## Eat Together and Amazon checkout

The host creates a food party from the Food tab or the room’s Eat Together button. The host publishes up to ten food names, quantities per participant, options, and Amazon.com links. Guests scan the QR invitation or paste its link into the Food tab. Each guest opens the same product links, completes their own Amazon checkout with their own address and payment, and reports their food status. Huddle synchronizes those reports every 2.5 seconds. The host’s list updates reset all reported statuses and require guests to review the new list.

Amazon handles all purchasing. Huddle does not link Amazon accounts, import Amazon orders, prefill grocery carts, submit payments, or receive delivery tracking. Product links preserve the ASIN and strip tracking parameters. Amazon’s Grubhub link opens its storefront; guests must find the named meal and options themselves. Local availability can prevent an exact match, so guests can report an unavailable selection. Amazon’s [Grubhub overview](https://www.aboutamazon.com/news/retail/amazon-prime-grubhub) documents restaurant ordering through Amazon. Amazon’s [mobile linking guidance](https://affiliate-program.amazon.com/help/node/topic/GHBY6W8UPTEFD3ZX) describes supported app handoffs; the phone and its installed apps determine whether a link opens Amazon Shopping or a browser.

You can run the browser companion and the food API from one origin:

```sh
npm ci
npm ci --prefix Huddle-RN-Web-Preview
npm run check:web
npm run food:server
```

Your browser can open http://localhost:8788. Your Vite development server also proxies `/api/food` to port 8788. You can copy the food settings from `.env.food.example` into your existing `.env` without replacing unrelated settings. Your phones require a reachable `FOOD_PUBLIC_ORIGIN`, such as `http://192.168.1.20:8788`, and `FOOD_HOST=0.0.0.0` for a local network demo. All devices must reach that address. The interface flags localhost invitations because another phone cannot reach the host through localhost.

Your Vega app uses the same API through the Food service address field. The simulator can reach the local service after you run `vega exec vda reverse tcp:8788 tcp:8788`; a physical device can use the host’s LAN address. Your TV displays the QR invitation while your phone handles Amazon checkout. Your browser retains its participant session in local storage. Your TV retains its session only while its process runs. The demo profile switcher does not change the food session’s identity.

The service stores party data atomically in `.data/food.json` by default. `FOOD_DATA_FILE` selects a different file. Your deployment must run one service process per file and preserve its data directory across restarts. Each invitation expires after seven days; subsequent writes remove expired parties. An invitation grants read and join access, while a separate bearer token authorizes a participant’s own status changes. The server enforces host-only list editing, revision checks, request limits, and per-party participant limits. The service stores no Amazon credentials, delivery addresses, or payment details. Public deployments require HTTPS and a reverse proxy; operators should treat invitations and the data file as private party data.

You can run the complete automated checks with these commands:

```sh
npm test
npm run check:web
npx playwright install chromium
npm run test:e2e
```

The browser tests decode the actual QR code, join two independent phone sessions, verify exact Amazon URLs, recover sessions after reload, synchronize statuses, reset statuses after list changes, and exercise unavailable items and network failures. The tests intercept the Amazon navigation boundary and never place purchases. The service tests exercise persistence across restarts, permission checks, invalid links, expired invitations, and stale writes. GitHub Actions runs the web build and both test suites for pull requests and main-branch changes.

## Browser development

You can run these commands from the repository root:

```sh
npm --prefix Huddle-RN-Web-Preview ci
npm run dev
```

You can open the preview at http://127.0.0.1:5173. You can use Tab and Enter to navigate controls, and Escape triggers the shared Back action. Your terminal stops the server when you press Ctrl+C.

## Vega development on macOS

The project's recorded Mac development environment used Vega CLI 1.4.5, Vega SDK 0.24.12112, the Vega Virtual Device, Vega Studio 0.24.1 for VS Code, and the required command-line support tools. Amazon's installer updated the shell configuration and enabled telemetry by default. A new machine requires the [official Vega SDK](https://developer.amazon.com/docs/vega/0.24/install-vega-sdk) and its macOS prerequisites.

You can rebuild the existing native project with these commands from the repository root:

```sh
source ~/vega/env
npm --prefix Huddle-Vega ci
npm run vega:build
npm run vega:run
```

You only need `npm --prefix Huddle-Vega ci` after a fresh clone or a dependency change. You can run `npm run vega:setup` only when the `Huddle-Vega` folder does not exist; the repository already contains that generated project. The scripts require Node.js 22.18 or newer.

The setup script asks the SDK to generate its `helloWorld` template in `Huddle-Vega`. The script preserves the SDK's React, React Native, Metro, Babel, native module, and manifest configuration. The script sets the initial package ID to `com.aryban.huddle` and targets Vega OS 1.2. You can change the package ID in `scripts/vega.mjs` before the first generation if your team needs a different identifier. The SDK resolves compatible dependency versions through `vega project install --fix`.

The setup script connects the SDK's registered entry point to Huddle's shared screens. Each build copies `Huddle-RN-Web-Preview/App.tsx` and `src/` into `Huddle-Vega/src/huddle` and excludes browser adapters. You should edit the original shared files because the next sync replaces the generated `src/huddle` directory.

The web project uses React Native 0.80.2 only for TypeScript definitions that match its React 19.1 dependency. Vite resolves runtime imports to `react-native-web`. The native project uses the versions supplied by Amazon's template and never copies the browser project's dependency configuration.

## Mac demo

You can start the virtual device after a successful native build:

```sh
vega virtual-device start
```

The SDK prints the `.vpkg` output path during the build. You should select the `aarch64` package for this Apple Silicon Mac and the component ID from `Huddle-Vega/manifest.toml`. The successful build on this Mac produced the following package:

```sh
cd Huddle-Vega
vega run-app build/aarch64-release/huddle_aarch64.vpkg com.aryban.huddle.main -d VirtualDevice
```

You can use the simulator's remote or arrow keys and Enter to navigate the app. The Vega adapter adds focus guides that remember controls within the navigation rail and content groups. The Back action closes the nickname editor first, dismisses a notice next, and then returns to the preceding screen. The Home screen allows Vega to handle Back when the app has no remaining history.

You can stop the virtual device with this command:

```sh
vega virtual-device stop
```

## Recommendation feedback harness

Huddle implements a small recursive self-improvement (RSI) loop for catalog movie rankings. Each profile can rate movies through the Movies screen or the room's main recommendation. The app stores one explicit like/dislike rating per profile and movie; a correction replaces that rating. The app saves ratings, learned weights, and evaluation results under each stable profile ID and restores them across reloads and restarts. The browser preview uses localStorage for its origin, and Vega uses the SDK's AsyncStorage API. The reset control clears only the current profile's saved learning. The app keeps this data on the current device; it does not synchronize profiles across devices. Clearing browser data or uninstalling the native app can remove these records.

The storage layer validates versioned records before restoration, waits for restoration before accepting ratings, and serializes saves per profile. A failed read preserves the saved record and blocks ratings for that profile until a retry succeeds or the user resets that profile. A failed save keeps the latest feedback in memory and presents a retry control.

The harness starts learning after a profile rates six distinct movies. It reserves every third movie rating for validation and trains bounded genre weights on the remaining ratings. Each run starts from the previous accepted weights, proposes up to five successive updates, and promotes an update only when it reduces mean squared prediction error on validation ratings. The harness stops the run when a candidate fails that check. A correction preserves the movie's original partition, and the neutral model replaces a champion when that champion performs worse than the neutral baseline.

The recommender preserves time filtering and the least-satisfied person's explicit taste score as its first ranking criterion. Learned feedback adjusts the average score by at most 0.5 points before the vote tiebreaker. The loop affects catalog movie ranking; the AI idea generator and game ranking retain their existing behavior. The small, repeatedly reused validation set measures a preference prediction proxy; it does not establish improved real-world recommendation quality.

You can replay a synthetic example with this command:

```sh
node scripts/rsi.mjs --demo
```

You can supply actual feedback through a JSON array with entries such as `{"friendId":"me","movieId":"m8","rating":1}`. Each entry uses a catalog movie ID, a known profile ID, and a rating of `1` or `-1`.

```sh
node scripts/rsi.mjs feedback.json
```

The command prints evaluation scores, promotion counts, learned weights, and the resulting group recommendation. The replay command leaves the running app's saved learning unchanged.

## Validation

You can run the automated checks from the repository root:

```sh
npm test
npm run check:web
```

The tests cover navigation history and native source preparation with a fixture. The fixture tests do not prove SDK compatibility. The native build command runs `vega project doctor`, checks the native TypeScript sources, and invokes `react-native build-vega` after SDK setup.

Your simulator validation should cover initial focus, every navigation tab, horizontal movie/game rows, scrolling, room entry, Back navigation, nickname editing with the virtual keyboard, and activity voting/removal. Your final competition demo should show Huddle inside the Vega Virtual Device and include the generated `.vpkg` if the competition requires a build artifact. The competition's own rules determine submission eligibility.

Amazon documents the [project build workflow](https://developer.amazon.com/docs/vega/latest/build-an-app), [virtual device workflow](https://developer.amazon.com/docs/vega/0.24/run-apps), [focus guides](https://developer.amazon.com/docs/vega-api/0.24/tvfocusguideview), and [BackHandler API](https://developer.amazon.com/docs/react-native-vega/0.83/backhandler).

## Live Bedrock recommendations

The AI button calls the local server through `/ai` in the web preview. The server uses Amazon Bedrock Converse with `us.amazon.nova-2-lite-v1:0` in `us-east-1` by default. The model selects and explains choices from five real films whose runtimes and genres come from Disney's official movie listings; this bounded candidate pool prevents invented titles and runtimes. The model does not search the entire film market. The app keeps credentials on the server and filters duplicate titles, movies already proposed, disliked genres and runtimes that exceed the shortest attendee budget. The UI makes a model request only when someone presses the AI button; preference edits clear stale ideas without starting another paid call.

You need an active AWS account with credits or billing enabled and permission to invoke the selected Bedrock model. Hackathon registration alone does not configure AWS access or apply a credit to an account. You can authenticate the installed AWS CLI through your console session:

```sh
aws login --profile huddle --region us-east-1
aws sts get-caller-identity --profile huddle
```

The current AWS SDK supports that login profile and refreshes its temporary credentials. You can copy `.env.example` to `.env` and keep the `AWS_PROFILE=huddle` setting. The repository ignores `.env` and other local environment files. A regional Bedrock API key in `AWS_BEARER_TOKEN_BEDROCK` provides an alternative; the server reads that key from `.env` and never includes it in the client bundle. The server supports `AWS_REGION`, `BEDROCK_MODEL_ID`, and `PORT` overrides.

You can start the endpoint and the web preview in separate terminals:

```sh
npm install
npm run ai:server
npm run dev
```

The server binds only to `127.0.0.1`. Its health route reports the model configuration without making a model call. The `npm run ai:check` command makes one actual model request through the endpoint and checks the returned suggestions against the group constraints. The server permits one request at a time, limits the process to ten model requests per minute, caps output at 800 tokens per request, and avoids automatic AWS retries. These controls limit usage; they do not enforce an account spending budget.

The native demo uses the same server through a VDA reverse connection. After the Vega simulator starts, you can run these commands:

```sh
npm run ai:vega
npm run vega:build
npm run vega:run
```

The reverse connection maps the simulator's `127.0.0.1:8787` to the Mac's local endpoint. You need to recreate the mapping after the device disconnects or restarts. The server must stay running on the Mac during the demo. A physical device uses the same approach through its VDA connection; this local setup does not provide a public hosted endpoint. The web build accepts a public endpoint override through `VITE_AI_ENDPOINT`; a hosted service requires its own authentication and usage controls before deployment.

AWS documents [console-based CLI login](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html), [Bedrock API keys](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-generate.html), and [Nova 2 Lite](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-2-lite.html).
