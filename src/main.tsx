import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/app/App';
import { registerServiceWorker } from './infrastructure/pwa/registerServiceWorker';
import './ui/styles/tokens.css';
import './ui/app/app.css';

const rootElement = document.querySelector('#root');

if (!rootElement) {
  throw new Error('Root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
