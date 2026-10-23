// The check makes one real model request through the running local endpoint.
import {remoteSuggester} from '../Huddle-RN-Web-Preview/src/ai.ts';
import {initialFriends, initialActivities, movies} from '../Huddle-RN-Web-Preview/src/data/mock.ts';

const endpoint = process.env.HUDDLE_AI_ENDPOINT ?? 'http://127.0.0.1:8787/ai';
try {
  const health = await fetch(new URL('/health', endpoint), {signal: AbortSignal.timeout(5000)});
  if (!health.ok) throw new Error(`The server health check returned ${health.status}.`);
  const {provider, modelId, region} = await health.json();
  const ideas = await remoteSuggester(endpoint)({friends: initialFriends, activities: initialActivities, catalog: movies.map(m => m.title), genres: ['Animation','Comedy','Family','Adventure','Fantasy','Mystery','Sci-Fi','Action']});
  if (!ideas.length) throw new Error('The model returned no suggestions that passed the group constraints.');
  console.log(JSON.stringify({provider, modelId, region, ideas}, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
