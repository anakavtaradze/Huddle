# Huddle

Huddle shares its React Native screens between a browser preview and a Vega OS integration. The competition demo targets Amazon's Vega Virtual Device on an Apple Silicon Mac. The browser preview provides a quick UI development loop; the native build produces the Vega package that the virtual device runs.

The repository contains the shared screens, Vega focus/back adapters, and generated native project in `Huddle-Vega`. Vega SDK 0.24.12112 successfully built the aarch64 release package, and the Vega Virtual Device installed and launched the app on this Mac. The current app uses mock movies, games, friends, plans, and room data. The app persists recommendation feedback on the current device. The app does not implement streaming, multiplayer synchronization, or authentication.

## Browser development

You can run these commands from the repository root:

```sh
npm --prefix Huddle-RN-Web-Preview ci
npm run dev
```

You can open the preview at http://127.0.0.1:5173. You can use Tab and Enter to navigate controls, and Escape triggers the shared Back action. Your terminal stops the server when you press Ctrl+C.

## Vega development on macOS

This Mac has Vega CLI 1.4.5, Vega SDK 0.24.12112, the Vega Virtual Device, Vega Studio 0.24.1 for VS Code, and the required command-line support tools. Amazon's installer updated the shell configuration and enabled telemetry by default. A new machine requires the [official Vega SDK](https://developer.amazon.com/docs/vega/0.24/install-vega-sdk) and its macOS prerequisites.

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
