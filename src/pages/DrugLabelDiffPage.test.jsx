import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DrugLabelDiffPage from './DrugLabelDiffPage';

describe('DrugLabelDiffPage', () => {
  it('renders the page title', () => {
    render(<DrugLabelDiffPage />);
    expect(screen.getByText('Drug Label Diff')).toBeInTheDocument();
  });
  it('renders the search input', () => {
    render(<DrugLabelDiffPage />);
    expect(screen.getByPlaceholderText(/Enter drug name/)).toBeInTheDocument();
  });
  it('renders quick-pick buttons', () => {
    render(<DrugLabelDiffPage />);
    expect(screen.getByText('aspirin')).toBeInTheDocument();
    expect(screen.getByText('metformin')).toBeInTheDocument();
  });
});
