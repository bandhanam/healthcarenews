import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import RegulatoryCalendarPage from './RegulatoryCalendarPage';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) })));
});

describe('RegulatoryCalendarPage', () => {
  it('renders the page title', async () => {
    render(<RegulatoryCalendarPage />);
    await waitFor(() => expect(screen.getByText('Regulatory Calendar')).toBeInTheDocument());
  });
  it('renders the subtitle', async () => {
    render(<RegulatoryCalendarPage />);
    await waitFor(() => expect(screen.getByText(/PDUFA dates/)).toBeInTheDocument());
  });
});
