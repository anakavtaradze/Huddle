import {remoteSuggester, type AiSuggester} from './ai';
import {AI_ENDPOINT} from './platform/aiEndpoint';
import {fit, reasons} from './recommend';

// Not a model: a small fixed shelf of fictional titles, ranked with the same common-ground fit.
const SHELF: {title: string; genre: string; length: string}[] = [
  {title: 'Starlight Bakery', genre: 'Animation · Comedy · Family', length: '1h 33m'},
  {title: 'The Quiet Lighthouse', genre: 'Mystery · Sci-Fi', length: '1h 51m'},
  {title: 'Echoes of Kestrel Bay', genre: 'Adventure · Fantasy', length: '1h 58m'},
  {title: 'Dance Floor Detectives', genre: 'Comedy · Mystery', length: '1h 44m'},
  {title: 'Ten Minutes to Midnight', genre: 'Action · Sci-Fi', length: '1h 47m'},
  {title: 'Hollow Hill', genre: 'Horror', length: '1h 38m'},
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
    .map(s => ({title: s.title, genre: s.genre, length: s.length, why: reasons(here, s.tags).join(' · ')}));
};

export const aiIsMock = false;
export const aiSuggester: AiSuggester = remoteSuggester(AI_ENDPOINT);
