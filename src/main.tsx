import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './pro.css';
import './juice.css';
import './theme.css';
import './immersive.css';
import './arcade-skin.css';
import './game-ui.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const workerUrl = new URL('./sw.js', document.baseURI);
    void navigator.serviceWorker.register(workerUrl, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' }).catch(() => {
      // Offline enhancements are optional; gameplay remains fully usable without them.
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
