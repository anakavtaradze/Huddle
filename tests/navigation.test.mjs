import assert from 'node:assert/strict';
import test from 'node:test';
import {initialNavigation, navigationReducer} from '../Huddle-RN-Web-Preview/src/navigation.ts';

test('The Back action restores the screen that opened a room.', () => {
  const friends = navigationReducer(initialNavigation, {type: 'go', page: 'Friends'});
  const room = navigationReducer(friends, {type: 'go', page: 'Room'});
  assert.deepEqual(navigationReducer(room, {type: 'back'}), friends);
  assert.deepEqual(navigationReducer(friends, {type: 'back'}), initialNavigation);
});

test('Repeated selections preserve history and Home clears history.', () => {
  const movies = navigationReducer(initialNavigation, {type: 'go', page: 'Movies'});
  assert.equal(navigationReducer(movies, {type: 'go', page: 'Movies'}), movies);
  assert.equal(navigationReducer(movies, {type: 'go', page: 'Home'}), initialNavigation);
  assert.equal(navigationReducer(initialNavigation, {type: 'back'}), initialNavigation);
});
