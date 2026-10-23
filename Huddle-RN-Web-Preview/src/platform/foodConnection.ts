import type {FoodSession} from '../food';

let base = 'http://127.0.0.1:8788';
let saved: FoodSession | null = null;
export const phoneCheckout = true;
export const foodEntry = false;
export const initialInvite = '';
export const getFoodBase = () => base;
export const setFoodBase = (value: string) => { base = value; };
export const loadFoodSession = () => saved;
export const saveFoodSession = (session: FoodSession | null) => { saved = session; };
export const openAmazon = (_url: string) => { throw new Error('You can scan the invitation with your phone to open Amazon.'); };
