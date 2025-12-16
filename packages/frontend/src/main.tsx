import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from './utils/registerServiceWorker';
import { performanceMonitor } from './utils/performance';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA functionality
registerServiceWorker();

// Track initial load performance
window.addEventListener('load', () => {
  const loadTime = performanceMonitor.measureLoadTime();
  
  if (loadTime !== null && loadTime > 2000) {
    console.warn(`[Performance] Initial load time (${loadTime}ms) exceeds 2s target`);
  }
});
