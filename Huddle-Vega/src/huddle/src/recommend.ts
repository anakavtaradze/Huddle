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

const names = (people: Friend[]) => people.length === 1 ? people[0].name : `${people.slice(0, -1).map(p => p.name).join(', ')} and ${people[people.length - 1].name}`;

// Plain-language reasons, grouped so people who share a taste share a line:
// "Sam, Alex and You like Comedy" and "Mia likes Animation + Family".
export function reasons(here: Friend[], tags: string[]): string[] {
  const lines = (pick: (f: Friend, tags: string[]) => string[], verb: string) => {
    const groups = new Map<string, {people: Friend[]; tags: string[]}>();
    for (const tag of tags) {
      const people = here.filter(f => pick(f, [tag]).length);
      if (!people.length) continue;
      const key = people.map(f => f.id).join(',');
      const group = groups.get(key) ?? {people, tags: []};
      group.tags.push(tag);
      groups.set(key, group);
    }
    return [...groups.values()].map(g => `${names(g.people)} ${g.people.length === 1 && g.people[0].id !== 'me' ? verb + 's' : verb} ${g.tags.join(' + ')}`);
  };
  const out = [...lines(liked, 'like'), ...lines(disliked, 'dislike')];
  return out.length ? out : ['No strong feelings either way'];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const min = (xs: number[]) => Math.min(...xs);

// The ranking preserves the least happy person's fit before applying learned preferences.
// The time filter excludes movies that exceed any online friend's budget.
export function recommend(friends: Friend[], movies: Movie[], games: Game[], activities: Activity[],
  feedbackScore: (friendId: string, tags: string[]) => number = () => 0): GroupPick | null {
  const here = friends.filter(f => f.online);
  if (!here.length || !movies.length) return null;
  const budget = min(here.map(f => f.minutes));
  const fits = movies.filter(m => movieMinutes(m.length) <= budget);
  if (!fits.length) return null;
  const pool = fits;
  const votes = (title: string) => activities.filter(a => a.title === title).reduce((n, a) => n + a.voters.length, 0);

  const ranked = pool
    .map(movie => {
      const tags = genres(movie.genre);
      const per = here.map(f => fit(f, tags));
      const learned = sum(here.map(f => {
        const score = feedbackScore(f.id, tags);
        return Number.isFinite(score) ? Math.max(-1, Math.min(1, score)) : 0;
      })) / here.length;
      return {movie, per, low: min(per), avg: sum(per) / per.length + learned * 0.5, votes: votes(movie.title), tags, learned};
    })
    .sort((a, b) => b.low - a.low || b.avg - a.avg || b.votes - a.votes)
    .map(r => {
      const scores: Record<string, number> = {};
      here.forEach((f, i) => { scores[f.id] = r.per[i]; });
      const why = reasons(here, r.tags);
      if (r.learned !== 0) why.push('Your group’s movie feedback also informs this ranking');
      return {movie: r.movie, scores, pickiest: here[r.per.indexOf(r.low)], why} as Ranked;
    });
  const best = ranked[0];

  const gameScore = (g: Game) => min(here.map(f => fit(f, [g.category])));
  const picks = games
    .filter(g => best.movie.gameIds.includes(g.id))
    .sort((a, b) => gameScore(b) - gameScore(a));

  const notes = [`Runs ${best.movie.length}, which suits everyone`];
  const objectors = here.filter(f => disliked(f, genres(best.movie.genre)).length > 0);
  notes.push(objectors.length === 0 ? 'Nobody dislikes it' : `${names(objectors)} ${objectors.length === 1 && objectors[0].id !== 'me' ? 'dislikes' : 'dislike'} some genres, but this is the best common ground`);
  const skipped = movies.filter(m => !pool.includes(m));
  if (skipped.length) {
    const short = here.find(f => f.minutes === budget);
    notes.push(`Too long for ${short?.name}: ${skipped.map(m => m.title).join(', ')}`);
  }
  return {...best, games: picks, notes, alternatives: ranked.slice(1, 4)};
}
