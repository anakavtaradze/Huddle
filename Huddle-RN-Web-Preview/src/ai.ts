import type {Friend, Activity} from './data/mock';

// Foundation for model-backed suggestions from outside the catalog.
// Today the mock answers; to go live, serve an endpoint that takes {prompt} and returns {text}
// (for example a small Lambda that calls Amazon Bedrock) and put its URL in AI_ENDPOINT.
export const AI_ENDPOINT = '';

export type AiIdea = {title: string; genre: string; why: string};
export type AiContext = {friends: Friend[]; activities: Activity[]; catalog: string[]};
export type AiSuggester = (ctx: AiContext) => Promise<AiIdea[]>;

export function buildPrompt({friends, activities, catalog}: AiContext): string {
  const here = friends.filter(f => f.online);
  const people = here.map(f => `- ${f.name}: likes ${f.likes.join(', ') || 'nothing in particular'}; dislikes ${f.dislikes.join(', ') || 'nothing'}; has ${f.minutes} minutes`);
  return [
    'Suggest 3 movies for a group watching together. Use titles NOT in the library list. Pick what nobody dislikes and keep to the shortest time budget.',
    `People here:\n${people.join('\n')}`,
    `Already proposed: ${activities.map(a => a.title).join(', ') || 'none'}`,
    `Library (do not repeat): ${catalog.join(', ')}`,
    'Reply with only a JSON array: [{"title": string, "genre": "A · B", "why": string}]',
  ].join('\n\n');
}

// Models often wrap JSON in prose or code fences, so take the first array and drop malformed items.
export function parseIdeas(text: string): AiIdea[] {
  const start = text.indexOf('['), end = text.lastIndexOf(']');
  if (start < 0 || end < start) return [];
  try {
    const raw = JSON.parse(text.slice(start, end + 1));
    return (Array.isArray(raw) ? raw : []).filter(i => i && typeof i.title === 'string' && i.title.trim())
      .map(i => ({title: String(i.title).trim(), genre: String(i.genre ?? ''), why: String(i.why ?? '')}));
  } catch { return []; }
}

export const remoteSuggester = (url: string): AiSuggester => async ctx => {
  const res = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({prompt: buildPrompt(ctx)})});
  if (!res.ok) throw new Error(`AI endpoint returned ${res.status}`);
  return parseIdeas(String((await res.json()).text ?? ''));
};
