// Local endpoint for Huddle's AI ideas: POST /ai {prompt} -> {text}, calling Claude on Amazon Bedrock.
// Auth is a Bedrock API key, so there are no dependencies. The key stays here and never reaches the app.
//   AWS_BEARER_TOKEN_BEDROCK=... node server/ai-server.mjs
// Optional: AWS_REGION (default us-east-1), BEDROCK_MODEL_ID, PORT (default 8787).
import http from 'node:http';
import {pathToFileURL} from 'node:url';

const CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'};

export function makeServer({token, region = 'us-east-1', modelId, baseUrl} = {}) {
  const base = baseUrl ?? `https://bedrock-runtime.${region}.amazonaws.com`;
  const send = (res, status, body) => { res.writeHead(status, {'Content-Type': 'application/json', ...CORS}); res.end(JSON.stringify(body)); };

  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (req.url === '/health') return send(res, 200, {ok: true, configured: Boolean(token)});
    if (req.method !== 'POST' || req.url !== '/ai') return send(res, 404, {error: 'Use POST /ai'});
    if (!token) return send(res, 503, {error: 'Set AWS_BEARER_TOKEN_BEDROCK to enable AI ideas'});

    let prompt;
    try {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw new Error('too large'); }
      prompt = JSON.parse(raw).prompt;
      if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('missing prompt');
    } catch (e) { return send(res, 400, {error: `Bad request: ${e.message}`}); }

    try {
      const up = await fetch(`${base}/model/${encodeURIComponent(modelId)}/converse`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({messages: [{role: 'user', content: [{text: prompt}]}], inferenceConfig: {maxTokens: 600, temperature: 0.7}}),
      });
      const data = await up.json().catch(() => ({}));
      if (!up.ok) return send(res, 502, {error: `Bedrock returned ${up.status}: ${data.message ?? 'no detail'}`});
      const text = (data.output?.message?.content ?? []).map(c => c.text ?? '').join('');
      return send(res, 200, {text});
    } catch (e) { return send(res, 502, {error: `Could not reach Bedrock: ${e.message}`}); }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {AWS_BEARER_TOKEN_BEDROCK: token, AWS_REGION: region, BEDROCK_MODEL_ID, PORT = 8787} = process.env;
  // ponytail: default model id is a guess; set BEDROCK_MODEL_ID to one your account has access to.
  const modelId = BEDROCK_MODEL_ID ?? 'us.anthropic.claude-3-5-haiku-20241022-v1:0';
  makeServer({token, region, modelId}).listen(PORT, '127.0.0.1', () =>
    console.log(`AI endpoint on http://127.0.0.1:${PORT}/ai (${token ? `model ${modelId}` : 'no token set, answering 503'})`));
}
