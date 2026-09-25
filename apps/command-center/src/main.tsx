import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { CommandCenterApp } from './App.js';
import './styles.css';

const root = document.querySelector('#root');
if (root === null) {
  throw new Error('Command Center root element is missing.');
}

createRoot(root).render(
  <StrictMode>
    <CommandCenterApp />
  </StrictMode>,
);
