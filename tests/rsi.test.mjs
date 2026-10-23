import assert from 'node:assert/strict';
import test from 'node:test';
import {recordFeedback, feedbackFit, improve} from '../Huddle-RN-Web-Preview/src/rsi.ts';
import {recommend} from '../Huddle-RN-Web-Preview/src/recommend.ts';
import {initialFriends, movies, games, initialActivities} from '../Huddle-RN-Web-Preview/src/data/mock.ts';

const sample = (index, rating = 1) => ({movieId: `movie-${index}`, tags: ['Comedy'], rating});
const train = (rating = () => 1) => Array.from({length: 6}).reduce((state, _, i) =>
  recordFeedback(state, 'me', sample(i, rating(i))), {});

test('The harness retains the baseline until a profile supplies six distinct movie ratings.', () => {
  let state = {};
  for (let i = 0; i < 5; i++) state = recordFeedback(state, 'me', sample(i));
  assert.deepEqual(state.me.weights, {});
  assert.equal(state.me.evaluation, null);
  assert.equal(recordFeedback(state, 'me', sample(0)), state);
  assert.equal(state.me.feedback.length, 5);
});

test('The harness recursively promotes candidates that improve held-out prediction error.', () => {
  const profile = train().me;
  assert.ok(profile.evaluation.after < profile.evaluation.before);
  assert.ok(profile.evaluation.promoted > 1);
  assert.ok(profile.evaluation.iterations <= 5);
  assert.ok(profile.weights.comedy > 0 && profile.weights.comedy <= 1);
  const next = improve(profile);
  assert.ok(next.evaluation.after <= profile.evaluation.after);
  assert.equal(feedbackFit(profile.weights, ['COMEDY', 'Comedy']), profile.weights.comedy);
});

test('The harness rejects updates when validation contradicts training feedback.', () => {
  const profile = train(i => i % 3 === 2 ? -1 : 1).me;
  assert.deepEqual(profile.weights, {});
  assert.deepEqual(profile.evaluation, {before: 1, after: 1, iterations: 1, promoted: 0});
});

test('Feedback corrections preserve the split and can roll back a stale champion.', () => {
  const original = train();
  let state = recordFeedback(original, 'me', sample(2, -1));
  state = recordFeedback(state, 'me', sample(5, -1));
  assert.deepEqual(state.me.weights, {});
  assert.equal(state.me.feedback.length, 6);
  assert.deepEqual(state.me.feedback.map(s => s.movieId), original.me.feedback.map(s => s.movieId));
  assert.equal(original.me.feedback[2].rating, 1);
  assert.ok(original.me.weights.comedy > 0);
});

test('The harness isolates profiles and ignores empty or invalid feedback.', () => {
  const state = train();
  const updated = recordFeedback(state, 'f1', sample(0, -1));
  assert.equal(updated.me, state.me);
  assert.deepEqual(updated.f1.weights, {});
  assert.equal(recordFeedback(state, 'me', {...sample(8), tags: [' ']}), state);
  assert.equal(recordFeedback(state, 'me', {...sample(8), rating: NaN}), state);
  assert.equal(feedbackFit({}, []), 0);
});

test('Learned feedback changes a tied recommendation through the live scoring hook.', () => {
  const state = train();
  const friend = {...initialFriends[4], likes: [], dislikes: [], minutes: 240};
  const pool = [movies[1], movies[7]];
  const score = (id, tags) => feedbackFit(state[id]?.weights ?? {}, tags);
  assert.equal(recommend([friend], pool, games, []).movie.id, 'm2');
  const pick = recommend([friend], pool, games, [], score);
  assert.equal(pick.movie.id, 'm8');
  assert.ok(pick.why.some(line => line.includes('movie feedback')));
  assert.equal(recommend([friend], pool, games, [], () => NaN).movie.id, 'm2');
});

test('Learning preserves minimum fit, time limits, attendance, and compatible games.', () => {
  const score = (_, tags) => tags.includes('Horror') || tags.includes('Music') ? 100 : -100;
  const baseline = recommend(initialFriends, movies, games, initialActivities);
  const pick = recommend(initialFriends, movies, games, initialActivities, score);
  assert.ok(Math.min(...Object.values(pick.scores)) >= Math.min(...Object.values(baseline.scores)));
  assert.ok(pick.games.every(game => pick.movie.gameIds.includes(game.id)));
  const short = initialFriends.map(f => ({...f, minutes: 90}));
  assert.equal(recommend(short, movies, games, [], score).movie.id, 'm8');
  assert.equal(recommend(short.map(f => ({...f, minutes: 60})), movies, games, [], score), null);
  assert.equal(recommend(short.map(f => ({...f, online: false})), movies, games, [], score), null);
  const offline = [...initialFriends, {...initialFriends[4], id: 'offline', online: false}];
  recommend(offline, movies, games, [], id => {assert.notEqual(id, 'offline');return 0;});
});
