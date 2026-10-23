import type {LearningStorage} from '../learningStorage';

export const learningStorage: LearningStorage = {
  async getItem(key) {return window.localStorage.getItem(key);},
  async setItem(key, value) {window.localStorage.setItem(key, value);},
};
