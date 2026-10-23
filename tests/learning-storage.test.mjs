import assert from 'node:assert/strict';
import test from 'node:test';
import {createLearningStore, decodeLearning, learningKey} from '../Huddle-RN-Web-Preview/src/learningStorage.ts';
import {recordFeedback, feedbackFit} from '../Huddle-RN-Web-Preview/src/rsi.ts';
import {recommend} from '../Huddle-RN-Web-Preview/src/recommend.ts';
import {initialFriends, movies, games} from '../Huddle-RN-Web-Preview/src/data/mock.ts';
import {learningStorage as webStorage} from '../Huddle-RN-Web-Preview/src/platform/learningStorage.web.ts';

const memoryStorage = () => {
  const data = new Map();
  return {data, async getItem(key) {return data.get(key) ?? null;}, async setItem(key, value) {data.set(key, value);}};
};
const rate = (store, id, movieId, rating = 1) => store.update(id,
  state => recordFeedback(state, id, {movieId, tags: ['Comedy'], rating}));
const trained = () => Array.from({length: 6}).reduce((state, _, index) =>
  recordFeedback(state, 'me', {movieId: `m${index}`, tags: ['Comedy'], rating: 1}), {}).me;
const serialize = (profile, friendId = 'me') => JSON.stringify({version: 1, friendId, profile});

test('A new app instance restores ratings, accepted weights, evaluations, and ranking behavior.', async () => {
  const storage = memoryStorage();
  const first = createLearningStore(storage, ['me', 'f1']);
  await first.load();
  for (let index = 0; index < 6; index++) await rate(first, 'me', `m${index}`);
  await rate(first, 'f1', 'm0', -1);
  const second = createLearningStore(storage, ['me', 'f1']);
  await second.load();
  assert.deepEqual(second.getSnapshot(), first.getSnapshot());
  assert.ok(second.getSnapshot().learning.me.weights.comedy > 0);
  const friend = {...initialFriends[4], likes: [], dislikes: [], minutes: 240};
  const pool = [movies[1], movies[7]];
  assert.equal(recommend([friend], pool, games, []).movie.id, 'm2');
  assert.equal(recommend([friend], pool, games, [], (id, tags) =>
    feedbackFit(second.getSnapshot().learning[id].weights, tags)).movie.id, 'm8');
});

test('Startup never replaces saved feedback with an empty initial state or an early click.', async () => {
  let release;
  let reads = 0;
  let writes = 0;
  const profile = trained();
  const store = createLearningStore({
    getItem() {reads++;return new Promise(resolve => {release = resolve;});},
    async setItem() {writes++;},
  }, ['me']);
  const firstLoad = store.load();
  assert.equal(store.load(), firstLoad);
  await rate(store, 'me', 'early');
  await store.reset('me');
  assert.equal(writes, 0);
  release(serialize(profile));
  await firstLoad;
  assert.equal(reads, 1);
  assert.equal(writes, 0);
  assert.deepEqual(store.getSnapshot().learning.me, profile);
});

test('The save queue preserves rapid corrections and a reset across a restart.', async () => {
  const storage = memoryStorage();
  const original = storage.setItem;
  let release;
  let calls = 0;
  storage.setItem = async (key, value) => {
    calls++;
    if (calls === 1) await new Promise(resolve => {release = resolve;});
    await original(key, value);
  };
  const store = createLearningStore(storage, ['me']);
  await store.load();
  const first = rate(store, 'me', 'm1');
  await Promise.resolve();
  const correction = rate(store, 'me', 'm1', -1);
  const reset = store.reset('me');
  assert.equal(calls, 1);
  release();
  await Promise.all([first, correction, reset]);
  const restored = createLearningStore(storage, ['me']);
  await restored.load();
  assert.deepEqual(restored.getSnapshot().learning, {});
  assert.equal(calls, 3);
});

test('A profile reset removes only that profile’s saved learning.', async () => {
  const storage = memoryStorage();
  const store = createLearningStore(storage, ['me', 'f1']);
  await store.load();
  await rate(store, 'me', 'm1');
  await rate(store, 'f1', 'm1', -1);
  const otherProfile = storage.data.get(learningKey('f1'));
  await store.reset('me');
  assert.equal(storage.data.get(learningKey('f1')), otherProfile);
  const restored = createLearningStore(storage, ['me', 'f1']);
  await restored.load();
  assert.equal(restored.getSnapshot().learning.me, undefined);
  assert.equal(restored.getSnapshot().learning.f1.feedback[0].rating, -1);
});

test('Failed reads preserve existing data and allow retries without disabling other profiles.', async () => {
  const storage = memoryStorage();
  storage.data.set(learningKey('me'), serialize(trained()));
  const original = storage.getItem;
  storage.getItem = async key => {if (key === learningKey('me')) throw new Error('Unavailable');return original(key);};
  const store = createLearningStore(storage, ['me', 'f1']);
  await store.load();
  assert.equal(store.getSnapshot().status.me, 'load-error');
  await rate(store, 'me', 'm7');
  assert.equal(storage.data.get(learningKey('me')), serialize(trained()));
  await rate(store, 'f1', 'm1');
  assert.equal(store.getSnapshot().status.f1, 'ready');
  storage.getItem = original;
  await store.retry('me');
  assert.deepEqual(store.getSnapshot().learning.me, trained());
  assert.equal(store.getSnapshot().status.me, 'ready');
});

test('Failed saves retain current learning and retry the latest snapshot.', async () => {
  const storage = memoryStorage();
  const original = storage.setItem;
  storage.setItem = async () => {throw new Error('Full');};
  const store = createLearningStore(storage, ['me']);
  await store.load();
  await rate(store, 'me', 'm1');
  await rate(store, 'me', 'm1', -1);
  assert.equal(store.getSnapshot().status.me, 'save-error');
  assert.equal(store.getSnapshot().learning.me.feedback[0].rating, -1);
  storage.setItem = original;
  await store.retry('me');
  assert.equal(store.getSnapshot().status.me, 'ready');
  assert.equal(decodeLearning(storage.data.get(learningKey('me')), 'me').feedback[0].rating, -1);
});

test('The decoder rejects damaged records, unsupported versions, and mismatched identities.', () => {
  assert.equal(decodeLearning(null, 'me'), undefined);
  assert.equal(decodeLearning(serialize(null), 'me'), undefined);
  for (const raw of [
    '{broken', JSON.stringify({version: 2, friendId: 'me', profile: trained()}),
    serialize(trained(), 'f1'), serialize({...trained(), weights: {comedy: 99}}),
    serialize({...trained(), feedback: [{movieId: 'm1', tags: [], rating: 1}]}),
    serialize({...trained(), feedback: [{movieId: 'm1', tags: ['comedy'], rating: 0}]}),
    serialize({...trained(), feedback: [trained().feedback[0], trained().feedback[0]]}),
    serialize({...trained(), evaluation: {before: 1, after: 0, iterations: 1, promoted: 9}}),
  ]) assert.throws(() => decodeLearning(raw, 'me'));
});

test('An explicit reset recovers a corrupt profile without overwriting it during startup.', async () => {
  const storage = memoryStorage();
  storage.data.set(learningKey('me'), '{broken');
  const store = createLearningStore(storage, ['me']);
  await store.load();
  assert.equal(storage.data.get(learningKey('me')), '{broken');
  assert.equal(store.getSnapshot().status.me, 'load-error');
  await store.reset('me');
  const restored = createLearningStore(storage, ['me']);
  await restored.load();
  assert.deepEqual(restored.getSnapshot(), {learning: {}, status: {me: 'ready'}});
});

test('The browser adapter stores data in localStorage and propagates storage failures.', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const data = new Map();
  Object.defineProperty(globalThis, 'window', {configurable: true, value: {localStorage: {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  }}});
  t.after(() => {if (original) Object.defineProperty(globalThis, 'window', original);else delete globalThis.window;});
  await webStorage.setItem('test', 'saved');
  assert.equal(await webStorage.getItem('test'), 'saved');
  Object.defineProperty(window, 'localStorage', {get() {throw new Error('Denied');}});
  await assert.rejects(webStorage.getItem('test'), /Denied/);
  await assert.rejects(webStorage.setItem('test', 'new'), /Denied/);
});
