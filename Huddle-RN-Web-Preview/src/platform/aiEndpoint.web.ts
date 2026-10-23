// Vite proxies this same-origin route to the local Bedrock server.
const env = (import.meta as ImportMeta & {env: {VITE_AI_ENDPOINT?: string}}).env;
export const AI_ENDPOINT = env.VITE_AI_ENDPOINT || '/ai';
