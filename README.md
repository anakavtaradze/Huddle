# Huddle

Huddle shares its React Native screens between a browser preview and a Vega OS integration. The competition demo targets Amazon's Vega Virtual Device on an Apple Silicon Mac. The browser preview provides a quick UI development loop; the native build produces the Vega package that the virtual device runs.

The repository contains the shared screens, Vega focus/back adapters, and generated native project in `Huddle-Vega`. Vega SDK 0.24.12112 successfully built the aarch64 release package, and the Vega Virtual Device installed and launched the app on this Mac. The current app uses mock movies, games, friends, plans, and movie-room data. The movie experience does not implement streaming, multiplayer synchronization, authentication, or persistent storage. Eat Together provides a separate synchronized food party with durable storage and capability-based participant sessions.

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

## Validation

You can run the automated checks from the repository root:

```sh
npm test
npm run check:web
```

The tests cover navigation history and native source preparation with a fixture. The fixture tests do not prove SDK compatibility. The native build command runs `vega project doctor`, checks the native TypeScript sources, and invokes `react-native build-vega` after SDK setup.

Your simulator validation should cover initial focus, every navigation tab, horizontal movie/game rows, scrolling, room entry, Back navigation, nickname editing with the virtual keyboard, and activity voting/removal. Your final competition demo should show Huddle inside the Vega Virtual Device and include the generated `.vpkg` if the competition requires a build artifact. The competition's own rules determine submission eligibility.

Amazon documents the [project build workflow](https://developer.amazon.com/docs/vega/latest/build-an-app), [virtual device workflow](https://developer.amazon.com/docs/vega/0.24/run-apps), [focus guides](https://developer.amazon.com/docs/vega-api/0.24/tvfocusguideview), and [BackHandler API](https://developer.amazon.com/docs/react-native-vega/0.83/backhandler).
