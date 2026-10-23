import {AsyncStorage} from '@amazon-devices/react-native-kepler';
import type {LearningStorage} from '../learningStorage';

export const learningStorage: LearningStorage = {
  getItem: key => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};
