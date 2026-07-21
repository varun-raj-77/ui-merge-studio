import { fireEvent, screen } from '@testing-library/react';
import { renderApp } from './renderApp';
test('shows stable tickets and selects through the query parameter', () => { renderApp('/tickets'); expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: /TCK-102/ })); expect(location.search).toBe('?ticket=TCK-102'); expect(screen.getByRole('heading', { name: 'Payment gateway timeout' })).toBeInTheDocument(); });
