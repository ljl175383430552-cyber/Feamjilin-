import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import JoinHub from './JoinHub.tsx';
import WatchApp from './watch/WatchApp.tsx';
import './index.css';

function resolveRoute(): 'app' | 'watch' | 'join' {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/w' || path === '/watch' || path.startsWith('/w/')) return 'watch';
  if (path === '/join' || path === '/pair' || path === '/wear') return 'join';
  // 哈希路由兜底：file:// 或某些手表浏览器不改写 history
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === '/w' || hash === 'w' || hash === '/watch') return 'watch';
  if (hash === '/join' || hash === 'join' || hash === '/pair') return 'join';
  return 'app';
}

const route = resolveRoute();
const Root = route === 'watch' ? WatchApp : route === 'join' ? JoinHub : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* 手表浏览器可能不支持 SW，忽略 */
    });
  });
}
