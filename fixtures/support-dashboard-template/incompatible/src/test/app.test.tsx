import { fireEvent, screen } from '@testing-library/react';
import { renderApp } from './renderApp';
test('uses a path segment for selected ticket state', () => { renderApp('/tickets'); fireEvent.click(screen.getByRole('button', { name: /TCK-102/ })); expect(location.pathname).toBe('/tickets/TCK-102'); expect(location.search).toBe(''); });

