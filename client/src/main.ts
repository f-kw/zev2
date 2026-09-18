import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import vuetify from './plugins/vuetify';

const component = ['/presentation-editing', '/presentation-editing/'].includes(window.location.pathname)
  ? import('./PresentationEditing.vue')
  : import('./App.vue');

void component.then(({ default: root }) => {
  const app = createApp(root);
  app.use(createPinia());
  app.use(vuetify);
  app.mount('#app');
});
