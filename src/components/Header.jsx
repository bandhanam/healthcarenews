import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Header.css';

const NAV_GROUPS = [
  { label: 'Home', path: '/' },
  { label: 'News', path: '/news' },
  {
    label: 'AI Tools',
    children: [
      { path: '/med-predict', label: 'MedPredict', desc: 'AI disease prediction', color: '#7c3aed' },
      { path: '/symptom-ai', label: 'SymptomAI', desc: 'Conversational symptom checker', color: '#0891b2' },
      { path: '/health-scan', label: 'HealthScan', desc: 'Lab report analyzer', color: '#059669' },
    ],
  },
  {
    label: 'Drug Intel',
    children: [
      { path: '/drug-intel', label: 'DrugIntel', desc: 'Trial maps & approvals', color: '#1e40af' },
      { path: '/drug-timeline', label: 'DrugTimeline', desc: 'Drug lifecycle visualizer', color: '#059669' },
      { path: '/drug-compare', label: 'DrugCompare', desc: 'Drug info & compare', color: '#9333ea' },
      { path: '/med-compare', label: 'MedCompare', desc: 'Head-to-head comparison', color: '#ec4899' },
      { path: '/drug-interactions', label: 'Interactions', desc: 'Drug interaction checker', color: '#ea580c' },
    ],
  },
  {
    label: 'Chemistry',
    children: [
      { path: '/molecule-viz', label: 'MoleculeViz', desc: '3D molecule viewer', color: '#4f46e5' },
      { path: '/chem-explorer', label: 'ChemExplorer', desc: 'Compound properties', color: '#059669' },
      { path: '/drug-repurpose', label: 'DrugRepurpose', desc: 'Find similar compounds', color: '#7c3aed' },
    ],
  },
  {
    label: 'Regulatory',
    children: [
      { path: '/patent-watch', label: 'PatentWatch', desc: 'Patent expirations & cliffs', color: '#b45309' },
      { path: '/regulatory-calendar', label: 'Regulatory Calendar', desc: 'PDUFA dates & advisory', color: '#0d9488' },
      { path: '/drug-label-diff', label: 'Drug Label Diff', desc: 'Compare label versions', color: '#0369a1' },
      { path: '/generic-tracker', label: 'Generic Tracker', desc: 'ANDA pipeline & generics', color: '#7c3aed' },
    ],
  },
  {
    label: 'Safety & Trials',
    children: [
      { path: '/adverse-events', label: 'SafetyWatch', desc: 'FDA adverse events', color: '#dc2626' },
      { path: '/drug-sentiment', label: 'DrugSentiment', desc: 'Patient reviews & FAERS', color: '#ec4899' },
      { path: '/trial-match', label: 'TrialFinder', desc: 'Clinical trial search', color: '#2563eb' },
      { path: '/clinical-insight', label: 'ClinicalInsight', desc: 'Trial success analytics', color: '#65a30d' },
    ],
  },
  {
    label: 'Analytics',
    children: [
      { path: '/live-pulse', label: 'LivePulse', desc: 'Real-time health dashboard', color: '#e11d48' },
      { path: '/bio-sentinel', label: 'BioSentinel', desc: 'Pharma company intel', color: '#d97706' },
      { path: '/outbreak-radar', label: 'OutbreakRadar', desc: 'Outbreak tracker', color: '#7c3aed' },
      { path: '/pharma-globe', label: 'PharmaGlobe', desc: 'Global approval map', color: '#4f46e5' },
      { path: '/research-radar', label: 'ResearchRadar', desc: 'PubMed trend analyzer', color: '#0284c7' },
    ],
  },
  {
    label: 'Provider Intelligence',
    children: [
      { path: '/provider-dashboard', label: 'Advanced Dashboard', desc: 'Search, analytics, and map in one view', color: '#004c97' },
      { path: '/physicians', label: 'Physician Directory', desc: 'Individual clinician search', color: '#1e40af' },
      { path: '/hospitals', label: 'Hospitals Directory', desc: 'Hospital and org directory', color: '#0f766e' },
      { path: '/specialties', label: 'Specialty Explorer', desc: 'Taxonomy and specialty analysis', color: '#7c3aed' },
      { path: '/heat-map', label: 'Heat Map', desc: 'Geographic coverage map', color: '#d97706' },
    ],
  },
];

function DropdownMenu({ items, onClose }) {
  return (
    <motion.div
      className="hdr-dropdown"
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.18 }}
    >
      {items.map((item) => (
        <Link key={item.path} to={item.path} className="hdr-dd-item" onClick={onClose}>
          <span className="hdr-dd-dot" style={{ background: item.color }} />
          <div className="hdr-dd-text">
            <span className="hdr-dd-label">{item.label}</span>
            <span className="hdr-dd-desc">{item.desc}</span>
          </div>
        </Link>
      ))}
    </motion.div>
  );
}

function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const closeAll = useCallback(() => {
    setOpenDropdown(null);
    setMenuOpen(false);
  }, []);

  useEffect(() => { closeAll(); }, [location.pathname, closeAll]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpenDropdown(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (group) => {
    if (group.path) return location.pathname === group.path;
    return group.children?.some((c) => location.pathname === c.path);
  };

  return (
    <motion.header
      className="header"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="header-inner">
        <Link to="/" className="logo-group" onClick={closeAll}>
          <img src="/logo.png" alt="Bandhanam" className="logo-img" />
          <div className="logo-text">
            <span className="logo-title">HealthPulse</span>
            <span className="logo-subtitle">Global Healthcare Intelligence</span>
          </div>
        </Link>

        <nav className="nav-desktop" ref={dropdownRef}>
          {NAV_GROUPS.map((group) =>
            group.path ? (
              <Link key={group.label} to={group.path} className={`hdr-nav-item ${isActive(group) ? 'active' : ''}`}>
                {group.label}
              </Link>
            ) : (
              <div key={group.label} className="hdr-nav-group">
                <button
                  className={`hdr-nav-item ${isActive(group) ? 'active' : ''}`}
                  onClick={() => setOpenDropdown(openDropdown === group.label ? null : group.label)}
                >
                  {group.label}
                  <svg className={`hdr-chevron ${openDropdown === group.label ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                <AnimatePresence>
                  {openDropdown === group.label && (
                    <DropdownMenu items={group.children} onClose={closeAll} />
                  )}
                </AnimatePresence>
              </div>
            )
          )}
          <Link to="/about" className={`hdr-nav-item ${location.pathname === '/about' ? 'active' : ''}`}>About</Link>
          <Link to="/contact" className={`hdr-nav-item ${location.pathname === '/contact' ? 'active' : ''}`}>Contact</Link>
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
            {NAV_GROUPS.map((group) =>
              group.path ? (
                <Link key={group.label} to={group.path} className={`nav-mobile-link ${location.pathname === group.path ? 'active' : ''}`} onClick={closeAll}>
                  {group.label}
                </Link>
              ) : (
                <div key={group.label} className="nav-mobile-group">
                  <span className="nav-mobile-heading">{group.label}</span>
                  {group.children.map((c) => (
                    <Link key={c.path} to={c.path} className={`nav-mobile-link nav-mobile-sub ${location.pathname === c.path ? 'active' : ''}`} onClick={closeAll}>
                      <span className="hdr-dd-dot" style={{ background: c.color }} />
                      {c.label}
                    </Link>
                  ))}
                </div>
              )
            )}
            <Link to="/about" className="nav-mobile-link" onClick={closeAll}>About</Link>
            <Link to="/contact" className="nav-mobile-link" onClick={closeAll}>Contact</Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

export default Header;
