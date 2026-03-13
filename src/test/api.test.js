import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLatestMonthDates } from '../api';

describe('API helpers', () => {
  it('getLatestMonthDates returns valid date range', () => {
    const { startDate, endDate } = getLatestMonthDates();
    expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(endDate) >= new Date(startDate)).toBe(true);
  });

  it('date range spans 30 days', () => {
    const { startDate, endDate } = getLatestMonthDates();
    const diff = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(29);
  });
});
