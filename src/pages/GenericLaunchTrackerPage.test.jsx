import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GenericLaunchTrackerPage from './GenericLaunchTrackerPage';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div>, tr: ({ children, ...p }) => <tr {...p}>{children}</tr> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url) => {
    if (url?.includes('view=generics')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ generics: [] }) });
    if (url?.includes('view=patents')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ patents: [] }) });
    if (url?.includes('view=cliffs')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ cliffs: [] }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ generics: [], patents: [], cliffs: [] }) });
  }));
});

describe('GenericLaunchTrackerPage', () => {
  it('renders the page title', async () => {
    render(<GenericLaunchTrackerPage />);
    await waitFor(() => expect(screen.getByText('Generic Launch Tracker')).toBeInTheDocument());
  });
  it('renders the subtitle', async () => {
    render(<GenericLaunchTrackerPage />);
    await waitFor(() => expect(screen.getByText(/ANDA pipeline/)).toBeInTheDocument());
  });
});
