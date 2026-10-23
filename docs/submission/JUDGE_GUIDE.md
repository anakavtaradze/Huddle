# Judge setup and testing guide

Huddle targets the Fire TV track through its Vega OS application. The repository also supplies a browser preview and a phone companion for Eat Together. These instructions describe the final feature set, including the Bedrock integration from PR #5.

## Prerequisites

The project requires Node.js 22.18 or newer and npm. The native app requires Amazon's [Vega SDK and macOS prerequisites](https://developer.amazon.com/docs/vega/0.24/install-vega-sdk). The existing native project targets Vega OS 1.2. The project's recorded development environment used Vega SDK 0.24.12112 and Vega CLI 1.4.5 on an Apple Silicon Mac.

The live AI feature requires an AWS account, valid server-side credentials, and permission to invoke the configured Bedrock model. The movie planner, local preference learning, and food party service require no AWS credentials. The project provides demo profiles and requires no Huddle account.

## Fresh clone

You can install the root service dependencies and browser dependencies with these commands:

```sh
git clone https://github.com/anakavtaradze/Huddle.git
cd Huddle
npm ci
npm ci --prefix Huddle-RN-Web-Preview
npm run check:web
```

## Browser and food service

You can run the food service in one terminal:

```sh
npm run food:server
```

You can run the browser preview in a second terminal:

```sh
npm run dev
```

Your browser can open <http://127.0.0.1:5173>. Vite forwards `/api/food` to the food service on port 8788 and `/ai` to the AI service on port 8787. You can use Tab and Enter to select browser controls, and Escape triggers the Back action. The food service also serves the built phone companion at <http://localhost:8788>.

## Live Bedrock recommendations

You can create a local environment file from the committed example on a fresh clone:

```sh
cp .env.example .env
```

You should preserve your existing settings if you already maintain a `.env` file. The example selects `AWS_PROFILE=huddle`, `AWS_REGION=us-east-1`, and `BEDROCK_MODEL_ID=us.amazon.nova-2-lite-v1:0`. Your AWS account must permit that inference profile and its required model access. You can select another compatible model through `BEDROCK_MODEL_ID`.

You can authenticate a current AWS CLI installation with these commands:

```sh
aws login --profile huddle --region us-east-1
aws sts get-caller-identity --profile huddle
```

The AWS SDK also supports its normal server-side credential providers. A regional Bedrock API key in `AWS_BEARER_TOKEN_BEDROCK` supplies an alternative. You must keep credentials in your local environment or `.env` file; the repository ignores local environment files.

You can start the AI service in a third terminal:

```sh
npm run ai:server
```

You can inspect <http://127.0.0.1:8787/health> without invoking the model. You can run `npm run ai:check` to make one live request and validate the returned suggestions. That command and the app's AI button use your configured AWS account's model access and billing. The server allows one active request, ten requests per minute, and up to 800 output tokens per request.

## Vega application

You can prepare and launch the existing native project from the repository root:

```sh
source ~/vega/env
npm ci --prefix Huddle-Vega
npm run vega:build
npm run vega:run
```

The build script copies the shared screens into `Huddle-Vega/src/huddle` and selects the host's architecture. The run script starts the Vega Virtual Device when necessary and installs the package. An Apple Silicon build produces `Huddle-Vega/build/aarch64-release/huddle_aarch64.vpkg`. The manifest declares `com.aryban.huddle.main` as the component ID.

You can connect the running simulator to the two local services with these commands:

```sh
npm run ai:vega
vega exec vda reverse tcp:8788 tcp:8788
```

You must keep the AI and food services running on the Mac. You must recreate the reverse mappings after a device disconnect or restart. Your simulator remote can navigate the controls through the direction pad, Enter, and Back.

## Phone invitation

Your phone needs a reachable address for the food service. You can replace the example IP below with your Mac's LAN IP and restart the food service with these settings:

```sh
FOOD_HOST=0.0.0.0 FOOD_PUBLIC_ORIGIN=http://192.168.1.20:8788 npm run food:server
```

Your Mac and phone must share a network that permits their connection. Your firewall must permit port 8788. You should create a new party after setting the reachable origin so its QR invitation contains that address. The simulator can retain the reverse mapping for port 8788. A physical TV can use the LAN address in the Food service address field.

The phone companion uses port 8788 for food invitations and checkout links. The Vite preview on port 5173 supplies the AI proxy for browser movie recommendations. The food service does not proxy the AI endpoint.

## Suggested test sequence

1. You can open the Vega app and navigate the Home, Movies, Friends, Plans, and Food screens with the remote.
2. You can open the Friday Movie Night room and inspect the Group Pick explanation. You can change a demo profile's tastes or available time and inspect the updated catalog ranking.
3. You can press Get AI ideas after starting the Bedrock service. Huddle should show permitted candidate films with explanation text, or a clear service error when AWS access fails.
4. You can rate six distinct catalog movies under one profile, restart the app, and confirm that Huddle restores the profile's rating count. Huddle may retain neutral weights when no proposed update improves validation error.
5. You can create an Eat Together party, publish a food name with its full Amazon.com product URL, and scan the QR invitation from your phone.
6. You can join with a guest name and inspect the shared selection. You can open its product page without completing a purchase. You can select the guest's unavailable status and observe the TV update.
7. You can edit the host's list and confirm that Huddle resets participant statuses for the new revision.

The movie-room members and votes represent local demonstration state. Food-party participants represent separate service sessions. The demo profile switcher does not change a food session's participant identity.

## Automated checks

You can run the checks from the repository root:

```sh
npm test
npm run check:web
npx playwright install chromium
npm run test:e2e
node scripts/rsi.mjs --demo
```

The unit and browser tests use fixtures and intercepted external boundaries. These checks do not invoke live Bedrock or place Amazon purchases. The native build and a simulator walkthrough provide separate evidence for Vega compatibility.

## Data and service limits

The browser stores profile learning in localStorage, and the native app stores it in AsyncStorage. Food parties use `.data/food.json` by default; `FOOD_DATA_FILE` selects another path. The food service requires one process per data file and a persistent directory. Food invitations expire after seven days. A hosted deployment requires HTTPS and a reverse proxy. The local AI service binds to loopback and requires additional deployment controls before public hosting.
