
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('Huddle', () => App);

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

const { element, getStyleElement } =
  AppRegistry.getApplication('Huddle');

createRoot(container).render(element);

const styles = getStyleElement();

if (styles) {
  const styleContainer = document.createElement('div');
  createRoot(styleContainer).render(styles);
  document.head.appendChild(styleContainer);
}
