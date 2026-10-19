export type Page = 'Home' | 'Movies' | 'Games' | 'Friends' | 'Plans' | 'Room';
export type Navigation = {page: Page; history: Page[]};
export type NavigationAction = {type: 'go'; page: Page} | {type: 'back'};

export const initialNavigation: Navigation = {page: 'Home', history: []};

export function navigationReducer(state: Navigation, action: NavigationAction): Navigation {
  if (action.type === 'go') {
    if (action.page === state.page) return state;
    if (action.page === 'Home') return initialNavigation;
    return {page: action.page, history: [...state.history, state.page]};
  }
  if (state.history.length === 0) return state;
  return {page: state.history[state.history.length - 1], history: state.history.slice(0, -1)};
}
