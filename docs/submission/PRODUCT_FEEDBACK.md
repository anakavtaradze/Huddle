# Product feedback draft

This draft describes the tools and implementation workarounds visible in the repository. The team should confirm the observations and adjust any subjective feedback before submitting this answer.

## Amazon Vega SDK, CLI, and Virtual Device

We used the Vega SDK and CLI to build the native React Native application, package its release, and launch it in the Vega Virtual Device. We used TVFocusGuideView for directional focus and AsyncStorage for persistent movie feedback.

The generated template supplied the native package structure, manifest, Metro configuration, and registered entry point. The virtual device supplied a target for remote navigation and the TV-to-phone workflow. The development environment recorded a successful package build and launch with SDK 0.24.12112 and CLI 1.4.5.

Our onboarding required the SDK installation, shell environment setup, native dependency installation, and template adaptation before the shared screens could run. The browser and Vega builds required different adapters for images, focus, storage, and service endpoints. We kept the SDK's dependency configuration in the native project and copied only the shared screen sources during builds.

We would improve the documentation with one complete example that covers a shared React Native Web interface, TV focus, persistent storage, and local API access. We would also add a troubleshooting section for device reverse mappings and phone-reachable invitation URLs. We would use Vega again for a TV product because its native controls and simulator support the shared-screen interaction that this project needs.

## Amazon Bedrock, Nova 2 Lite, and AWS SDK for JavaScript

We used Amazon Bedrock's Converse API with `us.amazon.nova-2-lite-v1:0` in `us-east-1` for the live recommendation path. The Node service uses the AWS SDK's BedrockRuntimeClient and ConverseCommand with server-side credentials. The app requests ideas only after an explicit button press.

The Converse API gave the service a structured request format and output-token controls. The SDK kept AWS authentication in the server environment. The integration also supports a regional Bedrock bearer token as an alternative.

Our onboarding required AWS authentication, model permission, a configured region, and a reachable local server. We added distinct messages for missing credentials, denied model access, throttling, timeouts, and invalid model configuration. We also validated model output against fixed candidate metadata because generated titles and runtimes cannot supply reliable catalog facts by themselves.

We would improve the onboarding material with a small end-to-end example that pairs temporary CLI credentials, inference-profile permissions, Converse, and a local device client. We would use Bedrock again for constrained recommendation explanations because its API fits a server-side integration. We would retain deterministic validation around every user-visible recommendation.

## React Native, React Native Web, TypeScript, and Vite

We used React Native and TypeScript for shared screens and Vite with React Native Web for the development preview and phone companion. The shared source directory reduced duplicate screen work. Platform-specific modules supplied the runtime differences.

The initial setup required separate web and native dependencies because the SDK template and browser preview use different React Native configurations. We would improve shared-platform examples with explicit extension-resolution and storage patterns. We would use this approach again for a prototype that combines a TV interface with a browser companion.

## Node.js, QRCode, Playwright, and GitHub Actions

We used Node.js for the AI and food services, QRCode for invitation images, Playwright for independent browser sessions, and GitHub Actions for repeatable checks. The browser tests decode the actual invitation code and exercise session recovery and status synchronization.

The food workflow required an explicit host address because a phone cannot reach another device through localhost. We exposed the public origin through configuration and tested the invitation boundary with separate contexts. We would use these tools again because they support repeatable checks across a TV service and phone clients.

## Optional feature requests

| Tool | Request and value | Priority |
| --- | --- | --- |
| Vega SDK | Amazon could publish a shared TV-and-web sample that covers focus, storage, and local services so teams can reproduce a complete prototype. | Important |
| Vega CLI | The CLI could surface local-service reverse-mapping examples beside simulator connection status so developers can diagnose device API access. | Important |
| Bedrock documentation | AWS could provide one temporary-credentials and inference-profile example for a local device app so developers can diagnose permission and region failures. | Important |

The team should submit a friction log only when it can confirm the exact steps, observed result, severity, and workaround from its development session.
