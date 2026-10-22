import assert from 'node:assert/strict';
import test from 'node:test';
import {recommend, movieMinutes} from '../Huddle-RN-Web-Preview/src/recommend.ts';
import {movies, games, initialFriends, initialActivities} from '../Huddle-RN-Web-Preview/src/data/mock.ts';

test('Movie length strings parse to minutes.', () => {
  assert.equal(movieMinutes('1h 36m'), 96);
  assert.equal(movieMinutes('2h 02m'), 122);
});

test('Common ground beats the most voted movie.', () => {
  const pick = recommend(initialFriends, movies, games, initialActivities);
  assert.equal(pick.movie.id, 'm2'); // KPop has the most votes but Sam dislikes Music.
  assert.equal(pick.pickiest.name, 'Mia');
  assert.ok(pick.games.every(g => pick.movie.gameIds.includes(g.id)));
});

test('Offline friends are ignored and a short time budget drops long movies.', () => {
  const onlyMia = initialFriends.map(f => ({...f, online: f.id === 'f1'}));
  assert.equal(recommend(onlyMia, movies, games, initialActivities).movie.id, 'm1');
  const longer = initialFriends.map(f => ({...f, minutes: 100}));
  assert.equal(recommend(longer, movies, games, initialActivities).movie.id, 'm1');
});

test('No one online gives no pick.', () => {
  assert.equal(recommend(initialFriends.map(f => ({...f, online: false})), movies, games, initialActivities), null);
});
