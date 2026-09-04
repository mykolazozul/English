import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register((import.meta.env.BASE_URL || '/') + 'sw.js').catch(() => {});
  });
}
// theme-tint favicon (green base)
try {
  const link = document.querySelector('link[rel="icon"]');
  if (link) link.href = (import.meta.env.BASE_URL || '/') + 'favicon.svg';
} catch {}
createRoot(document.getElementById('root')).render(<App />);
