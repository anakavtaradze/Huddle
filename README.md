# Huddle

Huddle shares its React Native screens between a browser preview and a Vega OS integration. The competition demo targets Amazon's Vega Virtual Device on an Apple Silicon Mac. The browser preview provides a quick UI development loop; the native build produces the Vega package that the virtual device runs.

The repository contains the shared screens, Vega focus/back adapters, and generated native project in `Huddle-Vega`. Vega SDK 0.24.12112 successfully built the aarch64 release package, and the Vega Virtual Device installed and launched the app on this Mac. The current app uses mock movies, games, friends, plans, and room data. The app does not implement streaming, multiplayer synchronization, authentication, or persistent storage.

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
