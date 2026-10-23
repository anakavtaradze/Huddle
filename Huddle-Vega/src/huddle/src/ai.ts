import type {Friend, Activity} from './data/mock';

export type AiIdea = {title: string; genre: string; length: string; why: string};
export type AiContext = {friends: Friend[]; activities: Activity[]; catalog: string[]; genres: string[]};
export type AiSuggester = (ctx: AiContext) => Promise<AiIdea[]>;

// Disney's official listings supply the runtime and genre metadata for this demo pool.
// The model ranks these real films and writes reasons; the app retains the listed facts.
export const realFilms = [
  {title: 'The Incredibles', genre: 'Action · Adventure · Animation · Family', length: '1h 55m', source: 'https://movies.disney.com/the-incredibles'},
  {title: 'Toy Story', genre: 'Adventure · Animation · Comedy · Family', length: '1h 25m', source: 'https://movies.disney.com/toy-story'},
  {title: 'Monsters, Inc.', genre: 'Adventure · Animation · Comedy · Family', length: '1h 35m', source: 'https://movies.disney.com/monsters-inc'},
  {title: 'Zootopia', genre: 'Adventure · Animation · Comedy', length: '1h 48m', source: 'https://movies.disney.com/zootopia'},
  {title: 'Ratatouille', genre: 'Animation · Comedy · Family', length: '1h 51m', source: 'https://movies.disney.com/ratatouille'},
];

export function buildPrompt({friends, activities, catalog, genres}: AiContext): string {
  const here = friends.filter(f => f.online);
  const people = here.map(f => `- ${f.name}: likes ${f.likes.join(', ') || 'nothing in particular'}; dislikes ${f.dislikes.join(', ') || 'nothing'}; can stay ${f.minutes} minutes`);
  const budget = here.length ? Math.min(...here.map(f => f.minutes)) : 0;
  return [
    'You recommend REAL, already released feature films for a group watching together on a TV. Suggest up to 3 existing films that are NOT in the library list.',
    'Select ONLY from the candidate films below. Copy their full titles, runtimes and genres exactly. Never invent a film or alter a runtime. Rank the choices for this group and explain your choices using the listed preferences.',
    `Candidate films: ${JSON.stringify(realFilms.map(({source, ...film}) => film))}`,
    `People here:\n${people.join('\n')}`,
    `Rules: never suggest anything with a genre someone dislikes; prefer genres several people like; each film must run ${budget} minutes or less; skip films already proposed. Return an empty array when no real film satisfies these rules.`,
    `Use full genre names from this list where possible: ${genres.join(', ')}`,
    `Already proposed: ${activities.map(a => a.title).join(', ') || 'none'}`,
    `Library (do not repeat): ${catalog.join(', ')}`,
    'Never abbreviate genres. Separate full genre names with the middle dot character, for example Comedy · Family.',
    'Reply with only a JSON array: [{"title": string, "genre": "Comedy · Family", "length": "1h 40m", "why": "one short sentence on why it suits this group"}]',
  ].join('\n\n');
}

// Models often wrap JSON in prose or code fences, so take the first array and drop malformed items.
export function parseIdeas(text: string): AiIdea[] {
  const start = text.indexOf('['), end = text.lastIndexOf(']');
  if (start < 0 || end < start) return [];
  try {
    const raw = JSON.parse(text.slice(start, end + 1));
    return (Array.isArray(raw) ? raw : []).filter(i => i && typeof i.title === 'string' && i.title.trim())
      .map(i => ({title: String(i.title).trim(), genre: String(i.genre ?? '').split(/[·,|]/).map((g: string) => g.trim()).filter(Boolean).join(' · '), length: String(i.length ?? ''), why: String(i.why ?? '')}));
  } catch { return []; }
}

export const remoteSuggester = (url: string): AiSuggester => async ctx => {
  if (!ctx.friends.some(f => f.online)) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({prompt: buildPrompt(ctx)}), signal: controller.signal});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : `AI endpoint returned ${res.status}`);
    const ideas = parseIdeas(String(data.text ?? '')).flatMap(idea => {
      const film = realFilms.find(f => f.title.toLowerCase() === idea.title.toLowerCase());
      return film ? [{title: film.title, genre: film.genre, length: film.length, why: idea.why}] : [];
    });
    if (!ideas.length) throw new Error('The AI returned no usable movie suggestions. Try again.');
    const here = ctx.friends.filter(f => f.online);
    const budget = Math.min(...here.map(f => f.minutes));
    const excluded = new Set([...ctx.catalog, ...ctx.activities.map(a => a.title)].map(t => t.trim().toLowerCase()));
    return ideas.filter(idea => {
      const duration = /^(\d+)h\s*(\d+)m$/.exec(idea.length.trim());
      const minutes = duration ? Number(duration[1]) * 60 + Number(duration[2]) : 0;
      const tags = idea.genre.split('·').map(t => t.trim().toLowerCase());
      const title = idea.title.toLowerCase();
      if (!idea.genre.trim() || !idea.why.trim() || excluded.has(title) || !minutes || minutes > budget || here.some(f => f.dislikes.some(d => tags.includes(d.toLowerCase())))) return false;
      excluded.add(title);
      return true;
    }).slice(0, 3);
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The AI request timed out. Check the server connection and try again.');
    if (error instanceof TypeError) throw new Error('The AI server could not be reached. Start the server and check the device connection.');
    throw error;
  } finally { clearTimeout(timer); }
};
