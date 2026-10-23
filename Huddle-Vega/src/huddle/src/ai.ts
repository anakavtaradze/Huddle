import type {Friend, Activity} from './data/mock';

// Foundation for model-backed suggestions from outside the catalog.
// Today the mock answers; to go live, serve an endpoint that takes {prompt} and returns {text}
// (for example a small Lambda that calls Amazon Bedrock) and put its URL in AI_ENDPOINT.
export const AI_ENDPOINT = '';

export type AiIdea = {title: string; genre: string; length: string; why: string};
export type AiContext = {friends: Friend[]; activities: Activity[]; catalog: string[]; genres: string[]};
export type AiSuggester = (ctx: AiContext) => Promise<AiIdea[]>;

export function buildPrompt({friends, activities, catalog, genres}: AiContext): string {
  const here = friends.filter(f => f.online);
  const people = here.map(f => `- ${f.name}: likes ${f.likes.join(', ') || 'nothing in particular'}; dislikes ${f.dislikes.join(', ') || 'nothing'}; can stay ${f.minutes} minutes`);
  const budget = here.length ? Math.min(...here.map(f => f.minutes)) : 0;
  return [
    'You recommend movies for a group watching together on a TV. Suggest 3 films that are NOT in the library list.',
    `People here:\n${people.join('\n')}`,
    `Rules: never suggest anything with a genre someone dislikes; prefer genres several people like; each film must run ${budget} minutes or less; skip films already proposed.`,
    `Use genres from this list where possible: ${genres.join(', ')}`,
    `Already proposed: ${activities.map(a => a.title).join(', ') || 'none'}`,
    `Library (do not repeat): ${catalog.join(', ')}`,
    'Reply with only a JSON array: [{"title": string, "genre": "A · B", "length": "1h 40m", "why": "one short sentence on why it suits this group"}]',
  ].join('\n\n');
}

// Models often wrap JSON in prose or code fences, so take the first array and drop malformed items.
export function parseIdeas(text: string): AiIdea[] {
  const start = text.indexOf('['), end = text.lastIndexOf(']');
  if (start < 0 || end < start) return [];
  try {
    const raw = JSON.parse(text.slice(start, end + 1));
    return (Array.isArray(raw) ? raw : []).filter(i => i && typeof i.title === 'string' && i.title.trim())
      .map(i => ({title: String(i.title).trim(), genre: String(i.genre ?? ''), length: String(i.length ?? ''), why: String(i.why ?? '')}));
  } catch { return []; }
}

export const remoteSuggester = (url: string): AiSuggester => async ctx => {
  const res = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({prompt: buildPrompt(ctx)})});
  if (!res.ok) throw new Error(`AI endpoint returned ${res.status}`);
  return parseIdeas(String((await res.json()).text ?? ''));
};
