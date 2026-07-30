import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './showcase/selectionBridge';
import './styles/app.css';
import './styles/showcase-selection.css';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
