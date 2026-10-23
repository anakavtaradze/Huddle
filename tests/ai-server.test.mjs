import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import {makeServer} from '../server/ai-server.mjs';

const listen = server => new Promise(r => server.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${server.address().port}`)));
const post = (url, body) => fetch(`${url}/ai`, {method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body)});

test('Without a token the endpoint says so instead of failing silently.', async () => {
  const s = makeServer({modelId: 'm'}); const url = await listen(s);
  const res = await post(url, {prompt: 'hi'});
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /AWS_BEARER_TOKEN_BEDROCK/);
  s.close();
});

test('A prompt goes to the Bedrock converse API with the bearer token and the text comes back.', async () => {
  let seen;
  const fake = http.createServer((req, res) => {
    let raw = ''; req.on('data', c => raw += c);
    req.on('end', () => {
      seen = {url: req.url, auth: req.headers.authorization, body: JSON.parse(raw)};
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({output: {message: {content: [{text: '[{"title":"X"}]'}]}}}));
    });
  });
  const upstream = await listen(fake);
  const s = makeServer({token: 'tok', modelId: 'some.model-v1:0', baseUrl: upstream}); const url = await listen(s);
  const res = await post(url, {prompt: 'pick movies'});
  assert.deepEqual(await res.json(), {text: '[{"title":"X"}]'});
  assert.equal(seen.url, '/model/some.model-v1%3A0/converse');
  assert.equal(seen.auth, 'Bearer tok');
  assert.equal(seen.body.messages[0].content[0].text, 'pick movies');
  s.close(); fake.close();
});

test('Bad requests and upstream errors give clear errors.', async () => {
  const fake = http.createServer((req, res) => { res.writeHead(403, {'Content-Type': 'application/json'}); res.end('{"message":"no access"}'); });
  const upstream = await listen(fake);
  const s = makeServer({token: 't', modelId: 'm', baseUrl: upstream}); const url = await listen(s);
  assert.equal((await post(url, 'not json')).status, 400);
  assert.equal((await post(url, {prompt: ''})).status, 400);
  const up = await post(url, {prompt: 'hi'});
  assert.equal(up.status, 502);
  assert.match((await up.json()).error, /403: no access/);
  s.close(); fake.close();
});
