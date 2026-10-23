// The local server keeps AWS credentials outside the app and calls Bedrock Converse.
import http from 'node:http';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {BedrockRuntimeClient, ConverseCommand} from '@aws-sdk/client-bedrock-runtime';

export const DEFAULT_MODEL = 'us.amazon.nova-2-lite-v1:0';
const DEFAULT_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:4173', 'http://localhost:4173'];
const TIMEOUT_MS = 20000;

export function createBedrockInvoker({token, region = 'us-east-1', modelId = DEFAULT_MODEL, baseUrl, client} = {}) {
  // The SDK resolves temporary credentials, SSO profiles and IAM roles on the server.
  const sdk = token ? null : client ?? new BedrockRuntimeClient({region, maxAttempts: 1});
  return async prompt => {
    const input = {modelId, messages: [{role: 'user', content: [{text: prompt}]}], inferenceConfig: {maxTokens: 800, temperature: 0.4}};
    let data;
    if (token) {
      const base = baseUrl ?? `https://bedrock-runtime.${region}.amazonaws.com`;
      const {modelId: _, ...body} = input;
      const response = await fetch(`${base}/model/${encodeURIComponent(modelId)}/converse`, {
        method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(`Bedrock returned ${response.status}`);
        error.name = data.__type?.split('#').pop() ?? 'BedrockError';
        error.status = response.status;
        throw error;
      }
    } else {
      data = await sdk.send(new ConverseCommand(input), {abortSignal: AbortSignal.timeout(TIMEOUT_MS)});
    }
    const text = (data.output?.message?.content ?? []).map(c => c.text ?? '').join('').trim();
    if (!text || data.stopReason === 'max_tokens') throw new Error('Bedrock returned an empty or incomplete response');
    return text;
  };
}

function failure(error) {
  if (/Credentials|Token|SSO|Unauthorized|UnrecognizedClient/.test(error.name)) return [503, 'AWS sign-in is missing or expired. Sign in to the configured AWS profile, or set AWS_BEARER_TOKEN_BEDROCK on the server.'];
  if (error.name === 'AccessDeniedException' || error.status === 403) return [503, 'AWS denied this model. Check Bedrock model access and the bedrock:InvokeModel permission for this account.'];
  if (error.name === 'ThrottlingException' || error.status === 429) return [429, 'Bedrock is busy. Wait a moment and try again.'];
  if (/Timeout|Abort/.test(error.name)) return [504, 'Bedrock took too long to respond. Try again.'];
  if (error.name === 'ValidationException' || error.name === 'ResourceNotFoundException') return [502, 'Bedrock rejected the model configuration. Check BEDROCK_MODEL_ID and AWS_REGION on the server.'];
  return [502, error.status ? `Bedrock returned ${error.status}. Check the server configuration.` : 'The server could not get a complete response from Bedrock.'];
}

export function makeServer({invoke, token, region = 'us-east-1', modelId = DEFAULT_MODEL, baseUrl, origins = DEFAULT_ORIGINS, maxRequests = 10} = {}) {
  const call = invoke ?? (token ? createBedrockInvoker({token, region, modelId, baseUrl}) : null);
  let active = false;
  let windowStart = Date.now();
  let requests = 0;
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const allowed = !origin || origins.includes(origin);
    const headers = {'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin'};
    if (origin && allowed) Object.assign(headers, {'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'});
    const send = (status, body) => { res.writeHead(status, headers); res.end(JSON.stringify(body)); };
    if (!allowed || req.headers['sec-fetch-site'] === 'cross-site') return send(403, {error: 'This origin cannot use the local AI server.'});
    if (req.method === 'OPTIONS') return send(204, {});
    if (req.method === 'GET' && req.url === '/health') return send(200, {ok: true, configured: Boolean(call), provider: 'bedrock', modelId, region});
    if (req.method !== 'POST' || req.url !== '/ai') return send(404, {error: 'Use POST /ai'});
    if (!call) return send(503, {error: 'Configure an AWS profile or AWS_BEARER_TOKEN_BEDROCK on the server.'});
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) return send(415, {error: 'Use application/json.'});
    let prompt;
    try {
      let raw = '';
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 20000) { send(413, {error: 'The request exceeds 20 KB.'}); return; }
        raw += chunk;
      }
      const body = JSON.parse(raw);
      prompt = body?.prompt;
      if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 12000) throw new Error();
    } catch { return send(400, {error: 'Supply a nonempty prompt of at most 12000 characters.'}); }
    if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); requests = 0; }
    if (active || requests >= maxRequests) return send(429, {error: 'The AI request limit has been reached. Wait a moment before refreshing.'});
    active = true;
    requests++;
    try { return send(200, {text: await call(prompt)}); }
    catch (error) { const [status, message] = failure(error); return send(status, {error: message}); }
    finally { active = false; }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const {AWS_BEARER_TOKEN_BEDROCK: token, AWS_REGION = 'us-east-1', BEDROCK_MODEL_ID = DEFAULT_MODEL, PORT = '8787'} = process.env;
  const invoke = createBedrockInvoker({token, region: AWS_REGION, modelId: BEDROCK_MODEL_ID});
  makeServer({invoke, region: AWS_REGION, modelId: BEDROCK_MODEL_ID}).listen(Number(PORT), '127.0.0.1', () =>
    console.log(`Huddle serves /ai on http://127.0.0.1:${PORT} using Bedrock ${BEDROCK_MODEL_ID} in ${AWS_REGION}.`));
}
