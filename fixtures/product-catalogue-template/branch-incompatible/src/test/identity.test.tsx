import { screen } from '@testing-library/react';
import { renderApp } from './renderApp';
test('renders numeric product identities', () => { renderApp(); expect(screen.getByLabelText('Numeric product identity 101')).toBeVisible(); });
