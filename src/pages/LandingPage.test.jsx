import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('framer-motion', () => {
  function createMotion(tag) {
    const Comp = ({ children, ...props }) => {
      const clean = {};
      for (const [k, v] of Object.entries(props)) {
        if (['className', 'style', 'id', 'role', 'href', 'onClick'].includes(k)) {
          clean[k] = v;
        }
      }
      const El = tag;
      return <El {...clean}>{children}</El>;
    };
    Comp.displayName = `motion.${tag}`;
    return Comp;
  }

  return {
    motion: new Proxy({}, { get: (_, tag) => createMotion(tag) }),
    AnimatePresence: ({ children }) => <>{children}</>,
    useInView: () => true,
  };
});

import LandingPage from './LandingPage';

describe('LandingPage', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

  it('renders the hero title', () => {
    renderPage();
    expect(screen.getByText(/Your Complete/)).toBeInTheDocument();
    expect(screen.getByText('Healthcare')).toBeInTheDocument();
    expect(screen.getByText(/Command Center/)).toBeInTheDocument();
  });

  it('renders the hero badge', () => {
    renderPage();
    expect(screen.getByText('Healthcare Intelligence Platform')).toBeInTheDocument();
  });

  it('renders CTA buttons', () => {
    renderPage();
    expect(screen.getByText('Explore News Feed')).toBeInTheDocument();
    expect(screen.getByText('Try AI Diagnostics')).toBeInTheDocument();
  });

  it('renders all four section titles', () => {
    renderPage();
    expect(screen.getAllByText('General Apps').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pro Apps').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all feature card titles', () => {
    renderPage();
    const featureTitles = [
      'News Feed', 'Disease & Drug News',
      'MedPredict', 'SymptomAI', 'HealthScan',
      'DrugIntel', 'Drug Timeline', 'DrugCompare',
      'Interactions', 'SafetyWatch', 'TrialFinder',
      'LivePulse', 'BioSentinel', 'PharmaGlobe',
      'OutbreakRadar', 'ResearchRadar', 'ClinicalInsight',
      'MedCompare',
      'Advanced Dashboard', 'Physician Directory', 'Hospitals Directory', 'Specialty Explorer', 'Heat Map',
      'MoleculeViz', 'ChemExplorer', 'DrugRepurpose',
      'PatentWatch', 'Regulatory Calendar', 'Drug Label Diff', 'Generic Launch Tracker',
    ];
    featureTitles.forEach((title) => {
      expect(screen.getAllByText(title).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders feature descriptions', () => {
    renderPage();
    expect(screen.getByText(/Browse the latest healthcare/)).toBeInTheDocument();
    expect(screen.getByText(/Upload medical reports/)).toBeInTheDocument();
    expect(screen.getByText(/Check potential drug-drug interactions/)).toBeInTheDocument();
  });

  it('renders the quick navigation links', () => {
    renderPage();
    const quickLinks = screen.getAllByText('General Apps');
    expect(quickLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders bottom CTA section', () => {
    renderPage();
    expect(screen.getByText(/Ready to transform/)).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Learn More')).toBeInTheDocument();
  });

  it('renders stats section', () => {
    renderPage();
    expect(screen.getByText('32+')).toBeInTheDocument();
    expect(screen.getByText('Specialized Tools')).toBeInTheDocument();
    expect(screen.getByText('Powered Insights')).toBeInTheDocument();
  });

  it('has correct routing links', () => {
    renderPage();
    const newsLink = screen.getByText('Explore News Feed').closest('a');
    expect(newsLink).toHaveAttribute('href', '/news');

    const medPredictLink = screen.getByText('Try AI Diagnostics').closest('a');
    expect(medPredictLink).toHaveAttribute('href', '/med-predict');
  });
});
