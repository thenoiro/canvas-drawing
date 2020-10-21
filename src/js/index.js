import DrawerApp from './App/App';

require('../index.css');

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('#drawer-area');
  const App = new DrawerApp({ container });
  App.init();
});
