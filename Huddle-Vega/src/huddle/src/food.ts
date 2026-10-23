export type FoodItem = {name: string; url: string; quantity: number; notes: string};
export type FoodStatus = 'choosing' | 'ordered' | 'ready' | 'unavailable';
export type FoodSession = {roomId: string; token: string; memberId: string; host: boolean};
export type FoodRoom = {
  id: string; title: string; revision: number; items: FoodItem[]; expiresAt: number;
  members: {id: string; name: string; status: FoodStatus}[];
  inviteUrl: string; qr: string; phoneAccessible: boolean;
};

// Huddle strips tracking data and accepts only US product pages or Amazon's Grubhub entry.
export function amazonFoodUrl(input: string): string {
  const match = input.match(/^https:\/\/(?:www\.)?amazon\.com(\/[^?#\s\\]*)?(?:[?#][^\s\\]*)?$/i);
  if (!match) {
    throw new Error('Huddle accepts HTTPS links from Amazon.com only.');
  }
  const path = match[1] || '/';
  const asin = path.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1];
  if (asin) return `https://www.amazon.com/dp/${asin.toUpperCase()}`;
  if (/^\/grubhub\/?$/.test(path)) return 'https://www.amazon.com/grubhub';
  throw new Error('Huddle requires an Amazon product link containing /dp/ or /gp/product/, or https://www.amazon.com/grubhub.');
}

// Vega does not implement the browser URL API, so shared code uses strict formats.
export function foodServiceOrigin(input: string): string {
  const value = input.trim().replace(/\/$/, '');
  const match = value.match(/^https?:\/\/(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::([0-9]{1,5}))?$/i);
  if (!match || (match[1] && (Number(match[1]) < 1 || Number(match[1]) > 65535))) {
    throw new Error('Huddle requires an HTTP or HTTPS service origin.');
  }
  return value;
}

export function foodInvitationId(input: string): string {
  const value = input.trim();
  const id = /^[A-Za-z0-9_-]{32}$/.test(value) ? value : value.match(/^https?:\/\/[^\s#]+\/#food=([A-Za-z0-9_-]{32})$/)?.[1];
  if (!id) throw new Error('Huddle requires a valid party invitation link or code.');
  return id;
}

export function validateFoodItems(value: unknown): FoodItem[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    throw new Error('Huddle requires between one and ten food items.');
  }
  return value.map(item => {
    if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > 100 ||
        typeof item.url !== 'string' || item.url.length > 2000 ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20 ||
        typeof item.notes !== 'string' || item.notes.length > 300) {
      throw new Error('Each food item requires a name, an Amazon link, a quantity from 1 to 20, and notes under 301 characters.');
    }
    return {name: item.name.trim(), url: amazonFoodUrl(item.url), quantity: item.quantity, notes: item.notes.trim()};
  });
}
