import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Header.css';

const NAV_LINKS = [
  { path: '/', label: 'Home' },
  { path: '/news', label: 'News Feed' },
  { path: '/disease-drug-news', label: 'Disease & Drug' },
  { path: '/med-predict', label: 'MedPredict' },
  { path: '/symptom-ai', label: 'SymptomAI' },
  { path: '/drug-intel', label: 'DrugIntel' },
  { path: '/drug-timeline', label: 'Timeline' },
  { path: '/drug-interactions', label: 'Interactions' },
  { path: '/adverse-events', label: 'SafetyWatch' },
  { path: '/trial-match', label: 'TrialFinder' },
  { path: '/drug-compare', label: 'DrugCompare' },
  { path: '/health-scan', label: 'HealthScan' },
  { path: '/live-pulse', label: 'LivePulse' },
  { path: '/bio-sentinel', label: 'BioSentinel' },
  { path: '/outbreak-radar', label: 'OutbreakRadar' },
  { path: '/pharma-globe', label: 'PharmaGlobe' },
  { path: '/med-compare', label: 'MedCompare' },
  { path: '/research-radar', label: 'Research' },
  { path: '/clinical-insight', label: 'ClinicalInsight' },
  { path: '/rx-calc', label: 'RxCalc' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact' },
];

function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.header
      className="header"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="header-inner">
        <Link to="/" className="logo-group">
          <img src="/logo.png" alt="Bandhanam" className="logo-img" />
          <div className="logo-text">
            <span className="logo-title">HealthPulse</span>
            <span className="logo-subtitle">Global Healthcare News</span>
          </div>
        </Link>

        <nav className="nav-desktop">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {menuOpen ? (
              <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
            ) : (
              <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
            )}
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            className="nav-mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-mobile-link ${location.pathname === link.path ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

export default Header;
