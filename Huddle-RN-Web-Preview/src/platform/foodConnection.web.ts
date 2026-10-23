import type {FoodSession} from '../food';

const params = new URLSearchParams(window.location.hash.slice(1));
export const initialInvite = params.get('food') || '';
export const foodEntry = Boolean(initialInvite);
export const phoneCheckout = false;
export const getFoodBase = () => '';
export const setFoodBase = (_value: string) => {};
let memory: FoodSession | null = null;
export function loadFoodSession(): FoodSession | null {
  try {
    const id = new URLSearchParams(window.location.hash.slice(1)).get('food') || localStorage.getItem('huddle.food.last');
    const raw = id && localStorage.getItem(`huddle.food.${id}`);
    const session = raw && JSON.parse(raw);
    if (session && typeof session.roomId === 'string' && typeof session.token === 'string' && typeof session.memberId === 'string' && typeof session.host === 'boolean') return session;
  } catch { /* Huddle retains an in-memory session when the browser blocks storage. */ }
  return memory;
}
export function saveFoodSession(session: FoodSession | null) {
  memory = session;
  window.history.replaceState(null, '', session ? `/#food=${session.roomId}` : '/');
  try {
    if (session) {
      localStorage.setItem(`huddle.food.${session.roomId}`, JSON.stringify(session));
      localStorage.setItem('huddle.food.last', session.roomId);
    } else localStorage.removeItem('huddle.food.last');
  } catch { /* Huddle keeps the current session usable without browser storage. */ }
}
export function openAmazon(url: string) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
}
