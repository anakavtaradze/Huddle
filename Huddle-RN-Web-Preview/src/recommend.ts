import type {Friend, Movie, Game, Activity} from './data/mock';

export type GroupPick = {
  movie: Movie;
  games: Game[];
  scores: Record<string, number>;
  pickiest: Friend;
  notes: string[];
};

const LIKE = 2;
const DISLIKE = -3;

export function movieMinutes(length: string): number {
  const m = /(\d+)h\s*(\d+)m/.exec(length);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

// One person's fit with a list of tags (genres or game categories).
function fit(friend: Friend, tags: string[]): number {
  const has = (list: string[], tag: string) => list.some(x => x.toLowerCase() === tag.toLowerCase());
  return tags.reduce((sum, t) => sum + (has(friend.likes, t) ? LIKE : 0) + (has(friend.dislikes, t) ? DISLIKE : 0), 0);
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const min = (xs: number[]) => Math.min(...xs);

// Common ground: rank by the least happy person first, then the average, then votes.
// Only online friends count, and movies longer than the shortest time budget are dropped.
export function recommend(friends: Friend[], movies: Movie[], games: Game[], activities: Activity[]): GroupPick | null {
  const here = friends.filter(f => f.online);
  if (!here.length || !movies.length) return null;
  const budget = min(here.map(f => f.minutes));
  const fits = movies.filter(m => movieMinutes(m.length) <= budget);
  const pool = fits.length ? fits : movies;
  const votes = (title: string) => activities.filter(a => a.title === title).reduce((n, a) => n + a.votes, 0);

  const ranked = pool
    .map(movie => {
      const per = here.map(f => fit(f, movie.genre.split('·').map(g => g.trim())));
      return {movie, per, low: min(per), avg: sum(per) / per.length, votes: votes(movie.title)};
    })
    .sort((a, b) => b.low - a.low || b.avg - a.avg || b.votes - a.votes);
  const best = ranked[0];

  const scores: Record<string, number> = {};
  here.forEach((f, i) => { scores[f.id] = best.per[i]; });
  const pickiest = here[best.per.indexOf(best.low)];

  const gameScore = (g: Game) => min(here.map(f => fit(f, [g.category])));
  const picks = games
    .filter(g => best.movie.gameIds.includes(g.id))
    .sort((a, b) => gameScore(b) - gameScore(a));

  const notes = [`${movieMinutes(best.movie.length)} min fits everyone here`];
  if (!fits.length) notes[0] = 'Nothing fits the shortest time budget, so length was ignored';
  notes.push(best.low >= 0 ? `Nobody dislikes it; ${pickiest.name} is the least keen` : `${pickiest.name} is not a fan, but it is the best common ground`);
  movies.filter(m => !pool.includes(m)).forEach(m => {
    const short = here.find(f => f.minutes === budget);
    notes.push(`Skipped ${m.title}: too long for ${short?.name}`);
  });
  return {movie: best.movie, games: picks, scores, pickiest, notes};
}
