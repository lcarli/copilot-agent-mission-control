import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { CommandCenterApp } from './App.js';
import './styles.css';

const root = document.querySelector('#root');
const parameters = new URLSearchParams(window.location.search);
const eventSessionId = parameters.get('eventSessionId') ?? undefined;
if (root === null) {
  throw new Error('Command Center root element is missing.');
}

createRoot(root).render(
  <StrictMode>
    <CommandCenterApp
      initialView={
        parameters.get('view') === 'presentation' ? 'presentation' : 'setup'
      }
      {...(eventSessionId === undefined ? {} : { eventSessionId })}
    />
  </StrictMode>,
);
