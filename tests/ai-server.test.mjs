import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import {createBedrockInvoker, makeServer} from '../server/ai-server.mjs';
import {remoteSuggester} from '../Huddle-RN-Web-Preview/src/ai.ts';
import {initialFriends, initialActivities, movies} from '../Huddle-RN-Web-Preview/src/data/mock.ts';

const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
});
const post = (url, body, headers = {}) => fetch(`${url}/ai`, {method: 'POST', headers: {'Content-Type': 'application/json', ...headers}, body: typeof body === 'string' ? body : JSON.stringify(body)});
const close = (t, ...servers) => t.after(() => servers.forEach(s => {s.closeAllConnections(); s.close();}));

// The fixtures never use local AWS credentials or make paid Bedrock requests.
test('The endpoint reports missing configuration without exposing credentials.', async t => {
  const s = makeServer(); close(t, s); const url = await listen(s);
  const res = await post(url, {prompt: 'hi'});
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /AWS profile/);
});

test('The bearer-token adapter calls Bedrock Converse and returns the model text.', async t => {
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
  const s = makeServer({token: 'tok', modelId: 'some.model-v1:0', baseUrl: upstream}); close(t, s, fake); const url = await listen(s);
  const res = await post(url, {prompt: 'pick movies'});
  assert.deepEqual(await res.json(), {text: '[{"title":"X"}]'});
  assert.equal(seen.url, '/model/some.model-v1%3A0/converse');
  assert.equal(seen.auth, 'Bearer tok');
  assert.equal(seen.body.messages[0].content[0].text, 'pick movies');
  assert.equal(seen.body.inferenceConfig.maxTokens, 800);
});

test('The credential-based adapter uses a Converse command with bounded output.', async () => {
  let seen;
  const client = {send: async (command, options) => {
    seen = {input: command.input, options};
    return {output: {message: {content: [{text: 'answer'}]}}};
  }};
  const invoke = createBedrockInvoker({client, modelId: 'model'});
  assert.equal(await invoke('hello'), 'answer');
  assert.equal(seen.input.modelId, 'model');
  assert.equal(seen.input.messages[0].content[0].text, 'hello');
  assert.equal(seen.input.inferenceConfig.maxTokens, 800);
  assert.ok(seen.options.abortSignal);
});

test('The endpoint rejects malformed requests and disallowed origins before invocation.', async t => {
  let calls = 0;
  const s = makeServer({invoke: async () => {calls++; return 'text';}}); close(t, s); const url = await listen(s);
  assert.equal((await post(url, 'not json')).status, 400);
  assert.equal((await post(url, {prompt: ''})).status, 400);
  assert.equal((await post(url, {prompt: 'hi'}, {'Content-Type': 'text/plain'})).status, 415);
  assert.equal((await post(url, {prompt: 'x'.repeat(21000)})).status, 413);
  assert.equal((await post(url, {prompt: 'hi'}, {Origin: 'https://untrusted.example'})).status, 403);
  assert.equal(calls, 0);
  const response = await post(url, {prompt: 'hi'}, {Origin: 'http://127.0.0.1:5173'});
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173');
  assert.equal(calls, 1);
});

test('The endpoint returns actionable authentication, access, and throttling errors.', async t => {
  for (const [name, status, pattern] of [['CredentialsProviderError',503,/sign-in/], ['AccessDeniedException',503,/model access/], ['ThrottlingException',429,/busy/], ['TimeoutError',504,/too long/]]) {
    const s = makeServer({invoke: async () => {throw Object.assign(new Error('sensitive details'), {name});}});
    close(t, s); const url = await listen(s);
    const response = await post(url, {prompt: 'hi'});
    assert.equal(response.status, status);
    const body = await response.json();
    assert.match(body.error, pattern);
    assert.doesNotMatch(body.error, /sensitive/);
  }
});

test('The endpoint limits paid requests instead of making unlimited model calls.', async t => {
  let calls = 0;
  const s = makeServer({maxRequests: 1, invoke: async () => {calls++; return 'text';}}); close(t, s); const url = await listen(s);
  assert.equal((await post(url, {prompt: 'hi'})).status, 200);
  assert.equal((await post(url, {prompt: 'hi'})).status, 429);
  assert.equal(calls, 1);
});

test('The app-to-server path grounds metadata and rejects repeated or invented ideas.', async t => {
  let prompt;
  const candidates = [
    {title: 'The Incredibles', genre: 'Horror', length: '1h 00m', why: 'The group shares a taste for adventure.'},
    {title: 'The Incredibles', genre: 'Comedy', length: '1h 43m'},
    {title: 'Sunday Soup', genre: 'Comedy', length: '1h 27m'},
    {title: 'Horror movie', genre: 'Horror, Mystery', length: '1h 30m', why: 'A mystery'},
    {title: 'Invented movie', genre: 'Comedy', length: '1h 00m', why: 'An invented recommendation'},
    {title: 'Unknown length', genre: 'Comedy', length: ''},
  ];
  const s = makeServer({invoke: async input => {prompt = input; return JSON.stringify(candidates);}}); close(t, s); const url = await listen(s);
  const suggest = remoteSuggester(`${url}/ai`);
  const result = await suggest({friends: initialFriends, activities: initialActivities, catalog: movies.map(m => m.title), genres: ['Comedy', 'Family']});
  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'The Incredibles');
  assert.equal(result[0].length, '1h 55m');
  assert.equal(result[0].genre, 'Action · Adventure · Animation · Family');
  assert.match(prompt, /120 minutes or less/);
  assert.match(prompt, /JSON array/);
});

test('The app preserves actionable server errors and avoids calls for an empty room.', async t => {
  let calls = 0;
  const s = makeServer({invoke: async () => {calls++; throw Object.assign(new Error(), {name:'CredentialsProviderError'});}}); close(t, s); const url = await listen(s);
  const suggest = remoteSuggester(`${url}/ai`);
  const ctx = {friends: initialFriends, activities: [], catalog: [], genres: []};
  await assert.rejects(suggest(ctx), /sign-in/);
  assert.deepEqual(await suggest({...ctx, friends: ctx.friends.map(f => ({...f, online: false}))}), []);
  assert.equal(calls, 1);
});


test('The app enforces time budgets and dislikes against the grounded metadata.', async t => {
  const s = makeServer({invoke: async () => JSON.stringify([{title:'The Incredibles', genre:'Comedy', length:'1h 00m', why:'A group pick'}])});
  close(t, s); const url = await listen(s); const suggest = remoteSuggester(`${url}/ai`);
  const ctx = {friends:[{...initialFriends[0], minutes:90}], activities:[], catalog:[], genres:[]};
  assert.deepEqual(await suggest(ctx), []);
  assert.deepEqual(await suggest({...ctx, friends:[{...initialFriends[0], dislikes:['Action']}]}), []);
});
