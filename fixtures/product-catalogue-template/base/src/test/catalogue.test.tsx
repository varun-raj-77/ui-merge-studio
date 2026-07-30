import { screen } from '@testing-library/react';
import { renderApp } from './renderApp';
test('renders stable catalogue data', () => { renderApp(); expect(screen.getByRole('heading', { name: 'Objects for focused work.' })).toBeVisible(); expect(screen.getAllByRole('article')).toHaveLength(5); expect(screen.getByText('Arc Headphones')).toBeVisible(); });
