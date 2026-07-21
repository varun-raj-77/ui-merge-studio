import { fireEvent, screen } from '@testing-library/react';
import { renderApp } from './renderApp';
test('filters activity and reports clipboard failure', async () => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }); renderApp('/tickets?ticket=TCK-102'); fireEvent.click(screen.getByRole('button', { name: 'status' })); expect(screen.getByText('No status activity found.')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Copy reference' })); expect(await screen.findByText(/Copy failed/)).toBeInTheDocument(); });
test('sorts ticket list newest first', () => { renderApp('/tickets'); const rows = screen.getAllByRole('button', { name: /TCK-/ }); expect(rows[0]).toHaveTextContent('TCK-104'); });

