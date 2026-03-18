import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ArticlesProvider } from './context/ArticlesContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import FloatingParticles from './components/FloatingParticles';
import Loader from './components/Loader';
import './App.css';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const DiseaseDrugPage = lazy(() => import('./pages/DiseaseDrugPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const MedPredictPage = lazy(() => import('./pages/MedPredictPage'));
const DrugIntelPage = lazy(() => import('./pages/DrugIntelPage'));
const DrugInteractionPage = lazy(() => import('./pages/DrugInteractionPage'));
const AdverseEventsPage = lazy(() => import('./pages/AdverseEventsPage'));
const TrialMatchPage = lazy(() => import('./pages/TrialMatchPage'));
const DrugComparePage = lazy(() => import('./pages/DrugComparePage'));
const HealthScanPage = lazy(() => import('./pages/HealthScanPage'));
const SymptomAIPage = lazy(() => import('./pages/SymptomAIPage'));
const DrugTimelinePage = lazy(() => import('./pages/DrugTimelinePage'));
const LivePulsePage = lazy(() => import('./pages/LivePulsePage'));
const BioSentinelPage = lazy(() => import('./pages/BioSentinelPage'));
const OutbreakRadarPage = lazy(() => import('./pages/OutbreakRadarPage'));
const PharmaGlobePage = lazy(() => import('./pages/PharmaGlobePage'));
const MedComparePage = lazy(() => import('./pages/MedComparePage'));
const ResearchRadarPage = lazy(() => import('./pages/ResearchRadarPage'));
const ClinicalInsightPage = lazy(() => import('./pages/ClinicalInsightPage'));
const RxCalcPage = lazy(() => import('./pages/RxCalcPage'));
const DrugRepurposePage = lazy(() => import('./pages/DrugRepurposePage'));
const MoleculeVizPage = lazy(() => import('./pages/MoleculeVizPage'));
const ChemExplorerPage = lazy(() => import('./pages/ChemExplorerPage'));
const PatentWatchPage = lazy(() => import('./pages/PatentWatchPage'));
const RegulatoryCalendarPage = lazy(() => import('./pages/RegulatoryCalendarPage'));
const DrugLabelDiffPage = lazy(() => import('./pages/DrugLabelDiffPage'));
const GenericLaunchTrackerPage = lazy(() => import('./pages/GenericLaunchTrackerPage'));

const SIDEBAR_PATHS = ['/news', '/disease-drug-news', '/category'];

function AppContent() {
  const location = useLocation();
  const showSidebar = SIDEBAR_PATHS.some((p) => location.pathname.startsWith(p));

  return (
    <>
      <FloatingParticles />
      <Header />
      <div className={`app-layout ${showSidebar ? 'with-sidebar' : 'full-width'}`}>
        {showSidebar && <Sidebar />}
        <main className="main-content">
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/news" element={<HomePage />} />
              <Route path="/disease-drug-news" element={<DiseaseDrugPage />} />
              <Route path="/category/:categoryName" element={<CategoryPage />} />
              <Route path="/article/:articleId" element={<ArticleDetailPage />} />
              <Route path="/med-predict" element={<MedPredictPage />} />
              <Route path="/drug-intel" element={<DrugIntelPage />} />
              <Route path="/drug-interactions" element={<DrugInteractionPage />} />
              <Route path="/adverse-events" element={<AdverseEventsPage />} />
              <Route path="/trial-match" element={<TrialMatchPage />} />
              <Route path="/drug-compare" element={<DrugComparePage />} />
              <Route path="/health-scan" element={<HealthScanPage />} />
              <Route path="/symptom-ai" element={<SymptomAIPage />} />
              <Route path="/drug-timeline" element={<DrugTimelinePage />} />
              <Route path="/live-pulse" element={<LivePulsePage />} />
              <Route path="/bio-sentinel" element={<BioSentinelPage />} />
              <Route path="/outbreak-radar" element={<OutbreakRadarPage />} />
              <Route path="/pharma-globe" element={<PharmaGlobePage />} />
              <Route path="/med-compare" element={<MedComparePage />} />
              <Route path="/research-radar" element={<ResearchRadarPage />} />
              <Route path="/clinical-insight" element={<ClinicalInsightPage />} />
              <Route path="/rx-calc" element={<RxCalcPage />} />
              <Route path="/drug-repurpose" element={<DrugRepurposePage />} />
              <Route path="/chem-explorer" element={<ChemExplorerPage />} />
              <Route path="/molecule-viz" element={<MoleculeVizPage />} />
              <Route path="/patent-watch" element={<PatentWatchPage />} />
              <Route path="/regulatory-calendar" element={<RegulatoryCalendarPage />} />
              <Route path="/drug-label-diff" element={<DrugLabelDiffPage />} />
              <Route path="/generic-tracker" element={<GenericLaunchTrackerPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo-row">
              <img src="/logo.png" alt="HealthPulse" className="footer-logo" />
              <div>
                <span className="footer-title">HealthPulse</span>
                <span className="footer-tagline">Global Healthcare Intelligence</span>
              </div>
            </div>
            <p className="footer-desc">
              AI-powered healthcare platform with 29+ tools for drug intelligence,
              molecular science, regulatory tracking, clinical trials, and research analytics.
            </p>
          </div>
          <div className="footer-col">
            <h4 className="footer-heading">AI Tools</h4>
            <a href="/med-predict">MedPredict</a>
            <a href="/symptom-ai">SymptomAI</a>
            <a href="/health-scan">HealthScan</a>
            <a href="/rx-calc">RxCalc</a>
          </div>
          <div className="footer-col">
            <h4 className="footer-heading">Drug Intel</h4>
            <a href="/drug-intel">DrugIntel</a>
            <a href="/drug-compare">DrugCompare</a>
            <a href="/drug-interactions">Interactions</a>
            <a href="/adverse-events">SafetyWatch</a>
          </div>
          <div className="footer-col">
            <h4 className="footer-heading">Regulatory</h4>
            <a href="/patent-watch">PatentWatch</a>
            <a href="/regulatory-calendar">Regulatory Calendar</a>
            <a href="/drug-label-diff">Drug Label Diff</a>
            <a href="/generic-tracker">Generic Tracker</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 HealthPulse. Built with real-time data from FDA, EMA, NIH, PubMed, PubChem &amp; ClinicalTrials.gov.</p>
        </div>
      </footer>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
        }}
      />
    </>
  );
}

function App() {
  useEffect(() => {
    const timer = setTimeout(() => {
      import('./utils/diseasePredictor').then((m) => m.preloadModel());
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ArticlesProvider>
      <div className="app">
        <AppContent />
      </div>
    </ArticlesProvider>
  );
}

export default App;
