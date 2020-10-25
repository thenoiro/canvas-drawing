import DrawerApp from './App/App';

require('../index.css');

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('#app');
  const App = new DrawerApp({ container });
  App.init();
});
