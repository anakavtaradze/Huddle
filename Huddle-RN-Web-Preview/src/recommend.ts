import type {Friend, Movie, Game, Activity} from './data/mock';

export type Ranked = {
  movie: Movie;
  scores: Record<string, number>;
  pickiest: Friend;
  why: string[];
};
export type GroupPick = Ranked & {games: Game[]; notes: string[]; alternatives: Ranked[]};

const LIKE = 2;
const DISLIKE = -3;

export function movieMinutes(length: string): number {
  const m = /(\d+)h\s*(\d+)m/.exec(length);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

export const genres = (genre: string) => genre.split('·').map(g => g.trim());

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const liked = (f: Friend, tags: string[]) => tags.filter(t => f.likes.some(x => same(x, t)));
const disliked = (f: Friend, tags: string[]) => tags.filter(t => f.dislikes.some(x => same(x, t)));

// One person's fit with a list of tags (genres or game categories).
export const fit = (f: Friend, tags: string[]) => liked(f, tags).length * LIKE + disliked(f, tags).length * DISLIKE;

// Plain-language reasons: who likes what, and who would put up with it.
export function reasons(here: Friend[], tags: string[]): string[] {
  const out = here.flatMap(f => {
    const l = liked(f, tags), d = disliked(f, tags);
    return [l.length && `${f.name} like${f.id === 'me' ? '' : 's'} ${l.join(' + ')}`, d.length && `${f.name} dislike${f.id === 'me' ? '' : 's'} ${d.join(' + ')}`].filter(Boolean) as string[];
  });
  return out.length ? out : ['No strong feelings either way'];
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
  const votes = (title: string) => activities.filter(a => a.title === title).reduce((n, a) => n + a.voters.length, 0);

  const ranked = pool
    .map(movie => {
      const tags = genres(movie.genre);
      const per = here.map(f => fit(f, tags));
      return {movie, per, low: min(per), avg: sum(per) / per.length, votes: votes(movie.title), tags};
    })
    .sort((a, b) => b.low - a.low || b.avg - a.avg || b.votes - a.votes)
    .map(r => {
      const scores: Record<string, number> = {};
      here.forEach((f, i) => { scores[f.id] = r.per[i]; });
      return {movie: r.movie, scores, pickiest: here[r.per.indexOf(r.low)], why: reasons(here, r.tags)} as Ranked;
    });
  const best = ranked[0];

  const gameScore = (g: Game) => min(here.map(f => fit(f, [g.category])));
  const picks = games
    .filter(g => best.movie.gameIds.includes(g.id))
    .sort((a, b) => gameScore(b) - gameScore(a));

  const notes = [fits.length ? `Runs ${best.movie.length}, which suits everyone` : 'Nothing fits the shortest time budget, so length was ignored'];
  const low = best.scores[best.pickiest.id];
  notes.push(low >= 0 ? 'Nobody dislikes it' : `${best.pickiest.name} is not a fan, but it is the best common ground`);
  const skipped = movies.filter(m => !pool.includes(m));
  if (skipped.length) {
    const short = here.find(f => f.minutes === budget);
    notes.push(`Too long for ${short?.name}: ${skipped.map(m => m.title).join(', ')}`);
  }
  return {...best, games: picks, notes, alternatives: ranked.slice(1, 4)};
}
