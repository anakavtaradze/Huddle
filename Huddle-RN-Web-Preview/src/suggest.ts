import {AI_ENDPOINT, remoteSuggester, type AiSuggester} from './ai';
import {fit, reasons} from './recommend';

// Not a model: a small fixed shelf of fictional titles, ranked with the same common-ground fit.
const SHELF: {title: string; genre: string}[] = [
  {title: 'Starlight Bakery', genre: 'Animation · Comedy · Family'},
  {title: 'The Quiet Lighthouse', genre: 'Mystery · Sci-Fi'},
  {title: 'Echoes of Kestrel Bay', genre: 'Adventure · Fantasy'},
  {title: 'Dance Floor Detectives', genre: 'Comedy · Mystery'},
  {title: 'Ten Minutes to Midnight', genre: 'Action · Sci-Fi'},
  {title: 'Hollow Hill', genre: 'Horror'},
];
export const mockSuggester: AiSuggester = async ({friends, catalog}) => {
  const here = friends.filter(f => f.online);
  if (!here.length) return [];
  return SHELF.filter(s => !catalog.includes(s.title))
    .map(s => {
      const tags = s.genre.split('·').map(g => g.trim());
      return {...s, low: Math.min(...here.map(f => fit(f, tags))), tags};
    })
    .sort((a, b) => b.low - a.low)
    .slice(0, 3)
    .map(s => ({title: s.title, genre: s.genre, why: reasons(here, s.tags).join(' · ')}));
};

export const aiIsMock = !AI_ENDPOINT;
export const aiSuggester: AiSuggester = AI_ENDPOINT ? remoteSuggester(AI_ENDPOINT) : mockSuggester;
