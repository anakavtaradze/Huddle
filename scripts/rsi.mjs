import {readFile} from 'node:fs/promises';
import {recordFeedback, feedbackFit} from '../Huddle-RN-Web-Preview/src/rsi.ts';
import {recommend, genres} from '../Huddle-RN-Web-Preview/src/recommend.ts';
import {movies, games, initialFriends, initialActivities} from '../Huddle-RN-Web-Preview/src/data/mock.ts';

// The demo supplies synthetic positive ratings; a JSON file supplies real replay data.
try {
  const input = process.argv[2];
  if (!input) throw new Error('The harness requires --demo or a feedback JSON file.');
  const events = input === '--demo'
    ? movies.slice(0, 6).map(movie => ({friendId: 'me', movieId: movie.id, rating: 1}))
    : JSON.parse(await readFile(input, 'utf8'));
  if (!Array.isArray(events)) throw new Error('The feedback file must contain an array.');
  let state = {};
  const runs = [];
  for (const event of events) {
    const movie = movies.find(m => m.id === event?.movieId);
    if (!movie || !initialFriends.some(f => f.id === event.friendId) || ![-1, 1].includes(event.rating)) {
      throw new Error('Each rating must identify a catalog movie, a known profile, and a rating of -1 or 1.');
    }
    const next = recordFeedback(state, event.friendId, {...event, tags: genres(movie.genre)});
    if (next !== state && next[event.friendId].evaluation) {
      runs.push({friendId: event.friendId, movieId: event.movieId, ...next[event.friendId].evaluation});
    }
    state = next;
  }
  const pick = recommend(initialFriends, movies, games, initialActivities,
    (id, tags) => feedbackFit(state[id]?.weights ?? {}, tags));
  console.log(JSON.stringify({synthetic: input === '--demo', runs, state, recommendation: pick?.movie.id ?? null}, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
