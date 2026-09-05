import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
try {
  const link = document.querySelector('link[rel="icon"]');
  if (link) link.href = '/favicon.svg';
} catch {}
createRoot(document.getElementById('root')).render(<App />);
