import Vue from 'vue';
import VueRouter from 'vue-router';

import Board from './components/Board.vue';

Vue.use(VueRouter);

const routes = [
  { path: '/', component: Board },
  { path: '/:room', component: Board },
];

export default new VueRouter({
  mode: 'history',
  routes,
});
