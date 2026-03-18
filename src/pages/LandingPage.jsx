import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import './LandingPage.css';

const SECTIONS = [
  {
    id: 'news',
    title: 'News & Intelligence',
    subtitle: 'Stay ahead with real-time healthcare insights from around the globe',
    features: [
      {
        title: 'News Feed',
        path: '/news',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
            <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z" />
          </svg>
        ),
        description: 'Browse the latest healthcare, pharma, and biotech news. Filter by country, organization, disease specialty, and date range.',
        color: 'var(--color-primary)',
        bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
      },
      {
        title: 'Disease & Drug News',
        path: '/disease-drug-news',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
            <path d="m8.5 8.5 7 7" />
          </svg>
        ),
        description: 'Deep-dive into disease and drug-specific articles with intelligent entity extraction and categorized insights.',
        color: '#0d9488',
        bg: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)',
      },
      {
        title: 'LivePulse',
        path: '/live-pulse',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        ),
        description: 'Real-time trending analysis of healthcare news. See what topics, categories, and regions are making headlines right now.',
        color: '#e11d48',
        bg: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI & Diagnostics',
    subtitle: 'Leverage artificial intelligence for smarter health insights',
    features: [
      {
        title: 'MedPredict',
        path: '/med-predict',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
            <circle cx="12" cy="12" r="10" strokeDasharray="4 4" opacity=".3" />
          </svg>
        ),
        description: 'Upload medical reports (PDF, images) and get AI-powered disease predictions using on-device machine learning. No data leaves your browser.',
        color: '#7c3aed',
        bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
      },
      {
        title: 'SymptomAI',
        path: '/symptom-ai',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
          </svg>
        ),
        description: 'Describe your symptoms in plain language and receive AI-driven analysis with body system mapping, severity assessment, and risk radar.',
        color: '#0891b2',
        bg: 'linear-gradient(135deg, #ecfeff, #cffafe)',
      },
      {
        title: 'HealthScan',
        path: '/health-scan',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
            <polyline points="14,2 14,8 20,8" />
            <path d="M12 18v-6M9 15l3 3 3-3" />
          </svg>
        ),
        description: 'Upload lab reports and instantly analyze values. Get normal range comparisons, trend tracking, and health summary insights.',
        color: '#059669',
        bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
      },
    ],
  },
  {
    id: 'drugintel',
    title: 'Drug Intelligence',
    subtitle: 'Comprehensive pharmaceutical pipeline and market intelligence',
    features: [
      {
        title: 'DrugIntel',
        path: '/drug-intel',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
        ),
        description: 'Explore clinical trial maps, global approval timelines, and competitor landscape radar for any drug or therapeutic area.',
        color: '#1e40af',
        bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
      },
      {
        title: 'Drug Timeline',
        path: '/drug-timeline',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="4" />
            <polyline points="6,10 12,4 18,10" />
            <circle cx="12" cy="14" r="2" />
            <path d="M4 20h16" />
          </svg>
        ),
        description: 'Visualize the complete drug development pipeline from Phase 1 to Phase 4. Track milestones, study phases, and enrollment trends.',
        color: '#059669',
        bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
      },
      {
        title: 'DrugCompare',
        path: '/drug-compare',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
        ),
        description: 'Compare drugs side-by-side across FDA, EMA, and CDSCO data. Analyze indications, mechanisms, and regulatory status globally.',
        color: '#9333ea',
        bg: 'linear-gradient(135deg, #faf5ff, #f3e8ff)',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety & Clinical Trials',
    subtitle: 'Monitor drug safety and find clinical trials worldwide',
    features: [
      {
        title: 'Interactions',
        path: '/drug-interactions',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ),
        description: 'Check potential drug-drug interactions using the NIH RxNav database. Enter multiple medications and see interaction severity and descriptions.',
        color: '#ea580c',
        bg: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
      },
      {
        title: 'SafetyWatch',
        path: '/adverse-events',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        ),
        description: 'Explore FDA Adverse Event Reporting System (FAERS) data. Search by drug, view reported reactions, outcomes, and safety signals.',
        color: '#dc2626',
        bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
      },
      {
        title: 'TrialFinder',
        path: '/trial-match',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <path d="M11 8v6M8 11h6" />
          </svg>
        ),
        description: 'Search ClinicalTrials.gov for active studies. Filter by condition, intervention, phase, and location to find matching trials.',
        color: '#2563eb',
        bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
      },
    ],
  },
];

const EXTRA_SECTIONS = [
  {
    id: 'chemistry',
    title: 'Chemistry & Molecular Science',
    subtitle: 'Powered by PubChem — 100M+ compounds with 3D structures and molecular intelligence',
    features: [
      {
        title: 'MoleculeViz',
        path: '/molecule-viz',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><circle cx="19" cy="6" r="2" /><circle cx="5" cy="6" r="2" /><circle cx="12" cy="20" r="2" />
            <line x1="14.5" y1="10" x2="17.5" y2="7.5" /><line x1="9.5" y1="10" x2="6.5" y2="7.5" /><line x1="12" y1="15" x2="12" y2="18" />
          </svg>
        ),
        description: '3D interactive molecule viewer with WebGL. Rotate, zoom, and explore real atomic structures from PubChem with color-coded atoms and bonds.',
        color: '#4f46e5',
        bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
      },
      {
        title: 'ChemExplorer',
        path: '/chem-explorer',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3h6v7l4 7H5l4-7V3Z" /><path d="M9 3h6" /><circle cx="12" cy="17" r="1" />
          </svg>
        ),
        description: 'Comprehensive drug compound cards — molecular properties, Lipinski Rule-of-5 analysis, radar charts, structure images, and chemical database browser.',
        color: '#059669',
        bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
      },
      {
        title: 'DrugRepurpose',
        path: '/drug-repurpose',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
        ),
        description: 'Find structurally similar drug compounds for repurposing. Compare molecular fingerprints, properties radar charts, and Lipinski compliance side-by-side.',
        color: '#7c3aed',
        bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
      },
    ],
  },
  {
    id: 'regulatory',
    title: 'Regulatory & Patents',
    subtitle: 'FDA Orange Book, PDUFA calendar, drug label versions, and generic launch tracking',
    features: [
      {
        title: 'PatentWatch',
        path: '/patent-watch',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        ),
        description: 'Track patent expirations, exclusivity dates, and patent cliffs for blockbuster drugs. Powered by FDA Orange Book data.',
        color: '#b45309',
        bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
      },
      {
        title: 'Regulatory Calendar',
        path: '/regulatory-calendar',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
        ),
        description: 'PDUFA dates, advisory committee meetings, and upcoming drug approvals. Curated regulatory calendar.',
        color: '#0d9488',
        bg: 'linear-gradient(135deg, #eefdfb, #ccfbf1)',
      },
      {
        title: 'Drug Label Diff',
        path: '/drug-label-diff',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
        ),
        description: 'Compare FDA drug label versions over time. See safety, indication, and dosage changes via openFDA.',
        color: '#0369a1',
        bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
      },
      {
        title: 'Generic Launch Tracker',
        path: '/generic-tracker',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ),
        description: 'ANDA pipeline, first-to-file status, approved generics, and launch dates. Orange Book patent cliffs.',
        color: '#7c3aed',
        bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics & Intelligence',
    subtitle: 'Real-time monitoring and competitive analysis across the healthcare landscape',
    features: [
      {
        title: 'LivePulse',
        path: '/live-pulse',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        ),
        description: 'Real-time dashboard with live news ticker, trending keywords, category radar, and sentiment analysis from global healthcare feeds.',
        color: '#e11d48',
        bg: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
      },
      {
        title: 'BioSentinel',
        path: '/bio-sentinel',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" /><path d="M12 12v4" />
          </svg>
        ),
        description: 'Pharma company competitive intelligence. Explore pipeline, therapeutic focus, R&D activity, and global approvals for any company.',
        color: '#d97706',
        bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
      },
      {
        title: 'PharmaGlobe',
        path: '/pharma-globe',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
          </svg>
        ),
        description: 'Interactive SVG world map showing drug approvals by country with animated pulsing nodes, regulatory body analysis, and trend charts.',
        color: '#4f46e5',
        bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
      },
    ],
  },
  {
    id: 'research',
    title: 'Research & Monitoring',
    subtitle: 'Track outbreaks, explore PubMed literature, and analyze trial success rates',
    features: [
      {
        title: 'OutbreakRadar',
        path: '/outbreak-radar',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><circle cx="12" cy="11" r="3" />
          </svg>
        ),
        description: 'AI-powered disease outbreak tracking from live news. Interactive dark map, severity alerts, disease filtering, and threat radar visualization.',
        color: '#7c3aed',
        bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
      },
      {
        title: 'ResearchRadar',
        path: '/research-radar',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z" />
          </svg>
        ),
        description: 'PubMed research trend analyzer. Explore 10-year publication trends, top journals, hot topic comparisons with NCBI E-utilities API.',
        color: '#0284c7',
        bg: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
      },
      {
        title: 'ClinicalInsight',
        path: '/clinical-insight',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
          </svg>
        ),
        description: 'Trial success rate analyzer with phase funnels, completion gauges, sponsor rankings, and enrollment metrics for any condition.',
        color: '#65a30d',
        bg: 'linear-gradient(135deg, #f7fee7, #ecfccb)',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Professional Tools',
    subtitle: 'Head-to-head drug comparison, medical calculators, and more',
    features: [
      {
        title: 'MedCompare',
        path: '/med-compare',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
        ),
        description: 'Side-by-side drug comparison using openFDA. Compare adverse reactions, safety profiles, side effect radar charts, and more.',
        color: '#ec4899',
        bg: 'linear-gradient(135deg, #fdf2f8, #fce7f3)',
      },
      {
        title: 'RxCalc',
        path: '/rx-calc',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h8M8 14h5" />
          </svg>
        ),
        description: 'Six essential medical calculators — BMI, BSA, eGFR kidney function, ideal body weight, calorie needs, and weight-based dosing.',
        color: '#475569',
        bg: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
      },
    ],
  },
];

const STATS = [
  { value: '29+', label: 'Specialized Tools' },
  { value: '50+', label: 'Data Sources' },
  { value: 'AI', label: 'Powered Insights' },
  { value: '0', label: 'Data Sent to Cloud' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

function FeatureCard({ feature, index }) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
    >
      <Link to={feature.path} className="landing-feature-card">
        <div className="landing-card-icon" style={{ background: feature.bg, color: feature.color }}>
          {feature.icon}
        </div>
        <div className="landing-card-body">
          <h3 className="landing-card-title">{feature.title}</h3>
          <p className="landing-card-desc">{feature.description}</p>
        </div>
        <div className="landing-card-arrow" style={{ color: feature.color }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    </motion.div>
  );
}

function SectionBlock({ section }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      className="landing-section"
      id={section.id}
      variants={sectionVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      <div className="landing-section-header">
        <h2 className="landing-section-title">{section.title}</h2>
        <p className="landing-section-subtitle">{section.subtitle}</p>
      </div>
      <div className="landing-features-grid">
        {section.features.map((feature, i) => (
          <FeatureCard key={feature.path} feature={feature} index={i} />
        ))}
      </div>
    </motion.section>
  );
}

function LandingPage() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <motion.div
          className="landing-hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="landing-hero-badge">Healthcare Intelligence Platform</span>
          <h1 className="landing-hero-title">
            Your Complete <span className="landing-gradient-text">Healthcare</span> Command Center
          </h1>
          <p className="landing-hero-desc">
            From real-time global news to AI-powered diagnostics, drug intelligence, and clinical trial discovery
            &mdash; HealthPulse brings everything healthcare professionals need into one unified platform.
          </p>
          <div className="landing-hero-actions">
            <Link to="/news" className="landing-btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
              </svg>
              Explore News Feed
            </Link>
            <Link to="/med-predict" className="landing-btn-secondary">
              Try AI Diagnostics
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="landing-hero-stats"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="landing-stat">
              <span className="landing-stat-value">{stat.value}</span>
              <span className="landing-stat-label">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </section>

      <nav className="landing-quick-nav">
        {[...SECTIONS, ...EXTRA_SECTIONS].map((s) => (
          <a key={s.id} href={`#${s.id}`} className="landing-quick-link">
            {s.title}
          </a>
        ))}
      </nav>

      {[...SECTIONS, ...EXTRA_SECTIONS].map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}

      <motion.section
        className="landing-cta"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="landing-cta-title">Ready to transform your healthcare workflow?</h2>
        <p className="landing-cta-desc">
          Start exploring HealthPulse tools and discover insights that matter.
        </p>
        <div className="landing-cta-actions">
          <Link to="/news" className="landing-btn-primary">Get Started</Link>
          <Link to="/about" className="landing-btn-ghost">Learn More</Link>
        </div>
      </motion.section>
    </div>
  );
}

export default LandingPage;
