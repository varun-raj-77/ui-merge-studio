// @vitest-environment jsdom
import '../setup';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { App } from '../../apps/studio/src/App';
afterEach(() => vi.restoreAllMocks());
test('loads inspected branches and starts an explicitly selected preview', async () => { const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ branches: ['branch-inspector','main'], clean: true, active: null }), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify({ branch: 'main', url: 'http://127.0.0.1:5000/tickets', origin: 'http://127.0.0.1:5000' }), { status: 200 })); render(<App />); await screen.findByText('Ready'); expect(screen.getByLabelText('Fixture branch')).toHaveValue('main'); fireEvent.click(screen.getByRole('button', { name: 'Start / restart preview' })); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2)); expect(await screen.findByTitle('main preview')).toHaveAttribute('src', 'http://127.0.0.1:5000/tickets'); });

