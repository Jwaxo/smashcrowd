import Vue from 'vue';
import VueSocketIO from 'vue-socket.io';

import App from './App.vue';
import router from './router';

// Sockets set up
Vue.use(
  new VueSocketIO({
    debug: true,
    connection: 'http://localhost:3000',
  })
);

Vue.config.productionTip = false;

new Vue({
  router,
  render: h => h(App),
}).$mount('#app');
