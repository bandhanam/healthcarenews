import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PatentWatchPage from './PatentWatchPage';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div>, tr: ({ children, ...p }) => <tr {...p}>{children}</tr> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url) => {
    const empty = { cliffs: [], patents: [], exclusivities: [], generics: [] };
    if (url?.includes('view=cliffs')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ cliffs: [] }) });
    if (url?.includes('view=patents')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ patents: [] }) });
    if (url?.includes('view=exclusivity')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ exclusivities: [] }) });
    if (url?.includes('view=generics')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ generics: [] }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(empty) });
  }));
});

describe('PatentWatchPage', () => {
  it('renders the page title', async () => {
    render(<PatentWatchPage />);
    await waitFor(() => expect(screen.getByText('PatentWatch')).toBeInTheDocument());
  });
  it('renders the subtitle', async () => {
    render(<PatentWatchPage />);
    await waitFor(() => expect(screen.getByText(/Track patent expirations/)).toBeInTheDocument());
  });
});
