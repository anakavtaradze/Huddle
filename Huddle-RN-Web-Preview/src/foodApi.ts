import {getFoodBase} from './platform/foodConnection';
import type {FoodSession} from './food';

export async function foodRequest<T>(path: string, method = 'GET', body?: unknown, session?: FoodSession): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${getFoodBase()}/api/food/${path}`, {
      method, signal: controller.signal,
      headers: {'Content-Type': 'application/json', ...(session ? {Authorization: `Bearer ${session.token}`} : {})},
      ...(body === undefined ? {} : {body: JSON.stringify(body)}),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw new Error(data?.error || 'Huddle could not reach its food service. You can retry after checking the connection.');
    return data as T;
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error instanceof TypeError)) {
      throw new Error('Huddle could not reach its food service. You can retry after checking the connection.');
    }
    throw error;
  } finally { clearTimeout(timeout); }
}
