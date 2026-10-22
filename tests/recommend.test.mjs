import assert from 'node:assert/strict';
import test from 'node:test';
import {recommend, reasons, movieMinutes} from '../Huddle-RN-Web-Preview/src/recommend.ts';
import {buildPrompt, parseIdeas} from '../Huddle-RN-Web-Preview/src/ai.ts';
import {movies, games, initialFriends, initialActivities} from '../Huddle-RN-Web-Preview/src/data/mock.ts';

const pick = friends => recommend(friends, movies, games, initialActivities);

test('Movie length strings parse to minutes.', () => {
  assert.equal(movieMinutes('1h 36m'), 96);
  assert.equal(movieMinutes('2h 02m'), 122);
});

test('Common ground beats the most voted movie.', () => {
  const p = pick(initialFriends);
  assert.equal(p.movie.id, 'm8'); // KPop has the most votes but Sam dislikes Music.
  assert.ok(p.games.every(g => p.movie.gameIds.includes(g.id)));
  assert.ok(p.why.some(w => /Sam.* like Comedy/.test(w)));
});

test('Alternatives are other movies that nobody dislikes, best first.', () => {
  const p = pick(initialFriends);
  assert.equal(p.alternatives.length, 3);
  assert.ok(p.alternatives.every(a => a.movie.id !== p.movie.id));
  assert.ok(p.alternatives.every(a => Object.values(a.scores).every(s => s >= 0)));
});

test('Offline friends are ignored.', () => {
  const onlyMia = initialFriends.map(f => ({...f, online: f.id === 'f1'}));
  assert.equal(pick(onlyMia).movie.id, 'm4');
});

test('A short time budget drops long movies and says who needs it.', () => {
  const short = initialFriends.map(f => ({...f, minutes: 90}));
  const p = pick(short);
  assert.equal(p.movie.id, 'm8');
  assert.equal(p.alternatives.length, 0);
  assert.ok(p.notes.some(n => n.startsWith('Too long for')));
});

test('No one online gives no pick.', () => {
  assert.equal(pick(initialFriends.map(f => ({...f, online: false}))), null);
});

test('The AI prompt names the people, the library and the reply format.', () => {
  const prompt = buildPrompt({friends: initialFriends, activities: initialActivities, catalog: ['Sunday Soup'], genres: ['Comedy', 'Mystery']});
  assert.match(prompt, /Sam: likes Mystery/);
  assert.match(prompt, /Sunday Soup/);
  assert.doesNotMatch(prompt, /Jordan/); // offline
  assert.match(prompt, /JSON array/);
  assert.match(prompt, /120 minutes or less/); // shortest budget among those here
  assert.match(prompt, /genres from this list where possible: Comedy, Mystery/);
});

test('AI replies are parsed even inside prose or code fences, and bad ones give nothing.', () => {
  const good = 'Sure!\n```json\n[{"title":"Starlight Bakery","genre":"Comedy","length":"1h 30m","why":"Cozy"},{"nope":1}]\n```';
  assert.deepEqual(parseIdeas(good), [{title: 'Starlight Bakery', genre: 'Comedy', length: '1h 30m', why: 'Cozy'}]);
  assert.deepEqual(parseIdeas('no list here'), []);
  assert.deepEqual(parseIdeas('[oops'), []);
});

test('Each voter counts once and breaks ties between equal fits.', () => {
  const same = movies.filter(m => ['m2', 'm3'].includes(m.id));
  const tied = f => f.map(x => ({...x, likes: [], dislikes: [], minutes: 240}));
  const votes = title => [{id: 'a', type: 'movie', title, voters: ['f1', 'f2']}];
  assert.equal(recommend(tied(initialFriends), same, games, votes('The Last Stardust')).movie.id, 'm3');
  assert.equal(recommend(tied(initialFriends), same, games, votes('Moonlight Mystery')).movie.id, 'm2');
});

test('The signed-in user reads naturally in reasons.', () => {
  const p = pick(initialFriends.filter(f => f.id === 'me'));
  assert.ok(p.why.some(w => w.startsWith('You like ')));
});

test('People who share a taste share one line.', () => {
  const here = initialFriends.filter(f => f.online);
  assert.deepEqual(reasons(here, ['Comedy']), ['Sam, Alex and You like Comedy']);
  assert.deepEqual(reasons(here, ['Animation', 'Family', 'Fantasy']), ['Mia likes Animation + Family + Fantasy']);
  assert.deepEqual(reasons(here, ['Music']), ['Mia likes Music', 'Sam dislikes Music']);
  assert.deepEqual(reasons(here, ['Documentary']), ['No strong feelings either way']);
});
