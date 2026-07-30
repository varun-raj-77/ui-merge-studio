import { render } from '@testing-library/react';
import { App } from '../app/App';
export function renderApp() { history.replaceState({}, '', '/catalogue'); return render(<App />); }
