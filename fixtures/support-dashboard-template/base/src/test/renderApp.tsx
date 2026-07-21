import { render } from '@testing-library/react';
import { App } from '../app/App';
export function renderApp(url = '/tickets') { history.replaceState({}, '', url); return render(<App />); }

