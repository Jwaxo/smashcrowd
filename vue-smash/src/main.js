import Vue from 'vue';
import App from './App.vue';
import VueSocketIO from 'vue-socket.io';

// Sockets set up
Vue.use(new VueSocketIO({
  debug: true,
  connection: 'http://localhost:8080',
}));

Vue.config.productionTip = false;

new Vue({
  render: h => h(App),
}).$mount('#app');
