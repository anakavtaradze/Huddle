import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {makeFoodServer} from '../server/food-server.mjs';
import {amazonFoodUrl, foodInvitationId, foodServiceOrigin} from '../Huddle-RN-Web-Preview/src/food.ts';

const food = [{name: 'Movie popcorn', url: 'https://www.amazon.com/example/dp/B000123456/ref=example?tag=tracking', quantity: 2, notes: 'The group chooses the plain variety.'}];
async function start(t, options = {}) {
  const server = makeFoodServer({file: null, ...options});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, method = 'GET', body, token) => {
    const response = await fetch(`${base}/api/food/${path}`, {method,
      headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
      ...(body === undefined ? {} : {body: JSON.stringify(body)})});
    return {status: response.status, body: await response.json()};
  };
  return {request, server, base};
}
const create = async request => (await request('rooms', 'POST', {name: 'Host', title: 'Movie night'})).body;

test('Amazon links retain exact product IDs and reject unsafe or unsupported destinations.', () => {
  assert.equal(amazonFoodUrl(food[0].url), 'https://www.amazon.com/dp/B000123456');
  assert.equal(amazonFoodUrl('https://amazon.com/gp/product/b000123456?tag=old'), 'https://www.amazon.com/dp/B000123456');
  assert.equal(amazonFoodUrl('https://www.amazon.com/grubhub'), 'https://www.amazon.com/grubhub');
  for (const url of ['javascript:alert(1)', 'http://amazon.com/dp/B000123456', 'https://amazon.com.evil.test/dp/B000123456',
    'https://amazon.com@evil.test/dp/B000123456', 'https://user:password@amazon.com/dp/B000123456',
    'https://www.amazon.com/gp/cart/view.html', 'https://amzn.to/example', 'https://amazon.com:444/dp/B000123456']) {
    assert.throws(() => amazonFoodUrl(url));
  }
});

test('Native connections and invitations use the same strict formats without browser URL APIs.', () => {
  const id = 'a'.repeat(32);
  assert.equal(foodInvitationId(`https://huddle.example/#food=${id}`), id);
  assert.equal(foodInvitationId(id), id);
  assert.throws(() => foodInvitationId('https://huddle.example/#food=missing'));
  assert.equal(foodServiceOrigin(' http://192.168.1.20:8788/ '), 'http://192.168.1.20:8788');
  for (const input of ['ftp://localhost', 'https://user:pass@example.com', 'http://localhost:99999', 'http://localhost/another-path']) {
    assert.throws(() => foodServiceOrigin(input));
  }
});

test('The host publishes exact food and two guests maintain independent statuses across a restart.', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'huddle-food-')); t.after(() => rmSync(dir, {recursive: true, force: true}));
  const file = join(dir, 'food.json');
  const {request} = await start(t, {file, publicOrigin: 'https://party.example'});
  const host = await create(request), path = `rooms/${host.session.roomId}`;
  const a = (await request(`${path}/join`, 'POST', {name: 'Mia'})).body;
  const b = (await request(`${path}/join`, 'POST', {name: 'Sam'})).body;
  assert.equal(a.session.host, false);
  assert.equal(host.session.host, true);
  assert.equal((await request(`${path}/items`, 'PUT', {items: food, revision: 0}, a.session.token)).status, 403);
  assert.equal((await request(`${path}/items`, 'PUT', {items: food, revision: 0})).status, 401);
  const published = await request(`${path}/items`, 'PUT', {items: food, revision: 0}, host.session.token);
  assert.equal(published.status, 200);
  assert.equal(published.body.items[0].url, 'https://www.amazon.com/dp/B000123456');
  assert.equal(published.body.inviteUrl, `https://party.example/#food=${host.session.roomId}`);
  assert.match(published.body.qr, /^data:image\/png;base64,/);
  assert.equal(published.body.phoneAccessible, true);
  assert.equal((await request(`${path}/status`, 'PATCH', {status: 'ordered', revision: 1}, a.session.token)).status, 200);
  await request(`${path}/status`, 'PATCH', {status: 'ready', revision: 1}, b.session.token);
  const view = (await request(path)).body;
  assert.deepEqual(view.members.map(m => m.status), ['choosing', 'ordered', 'ready']);
  assert.ok(!JSON.stringify(view).includes(a.session.token));
  assert.ok(!JSON.stringify(view).includes(host.session.token));
  const restarted = await start(t, {file});
  assert.deepEqual((await restarted.request(path)).body.members, view.members);
  assert.equal((await restarted.request(`${path}/status`, 'PATCH', {status: 'unavailable', revision: 1}, a.session.token)).status, 200);
  assert.equal((await restarted.request(`${path}/items`, 'PUT', {items: food, revision: 1}, host.session.token)).status, 200);
  assert.deepEqual((await restarted.request(path)).body.members.map(m => m.status), ['choosing', 'choosing', 'choosing']);
  assert.equal((await restarted.request(`${path}/status`, 'PATCH', {status: 'ready', revision: 1}, b.session.token)).status, 409);
  assert.equal((await restarted.request(`${path}/items`, 'PUT', {items: food, revision: 1}, host.session.token)).status, 409);
});

test('The service validates requests, isolates parties, rejects foreign origins, and expires invitations.', async t => {
  let clock = Date.now();
  const {request, base} = await start(t, {now: () => clock});
  assert.equal((await request('rooms', 'POST', {name: '', title: 'Test'})).status, 400);
  assert.equal((await request('rooms', 'POST', null)).status, 400);
  const host = await create(request), other = await create(request), path = `rooms/${host.session.roomId}`;
  assert.equal((await request(`${path}/status`, 'PATCH', {status: 'ordered', revision: 0}, host.session.token)).status, 409);
  assert.equal((await request(`${path}/items`, 'PUT', {items: food, revision: 0}, other.session.token)).status, 401);
  for (const items of [[], Array(11).fill(food[0]), [{...food[0], quantity: 1.5}], [{...food[0], quantity: 21}], [{...food[0], name: ''}], [{...food[0], url: 'https://evil.test'}]]) {
    assert.equal((await request(`${path}/items`, 'PUT', {items, revision: 0}, host.session.token)).status, 400);
  }
  assert.equal((await request(`${path}/status`, 'PATCH', {status: 'paid', revision: 0}, host.session.token)).status, 400);
  assert.equal((await fetch(`${base}/api/food/rooms`, {method: 'POST', headers: {Origin: 'https://evil.test'}})).status, 403);
  assert.equal((await fetch(`${base}/api/food/rooms`, {method: 'POST', body: '{}'})).status, 415);
  assert.equal((await fetch(`${base}/api/food/rooms`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{'})).status, 400);
  assert.equal((await fetch(`${base}/api/food/rooms`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({data: 'x'.repeat(33000)})})).status, 413);
  clock += 8 * 86400000;
  assert.equal((await request(path)).status, 404);
  assert.equal((await request(`${path}/join`, 'POST', {name: 'Late guest'})).status, 404);
});

test('The service limits write bursts and retains committed data when persistence fails.', async t => {
  const limited = await start(t, {rateLimit: 1});
  await create(limited.request);
  assert.equal((await limited.request('rooms', 'POST', {name: 'Another', title: 'Another'})).status, 429);
  const {request} = await start(t, {file: '/dev/null/food.json'});
  assert.equal((await request('rooms', 'POST', {name: 'Host', title: 'Party'})).status, 500);
});
