import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ArticlesProvider } from './context/ArticlesContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import FloatingParticles from './components/FloatingParticles';
import Loader from './components/Loader';
import './App.css';

const HomePage = lazy(() => import('./pages/HomePage'));
const DiseaseDrugPage = lazy(() => import('./pages/DiseaseDrugPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const MedPredictPage = lazy(() => import('./pages/MedPredictPage'));
const DrugIntelPage = lazy(() => import('./pages/DrugIntelPage'));

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
        <FloatingParticles />
        <Header />
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/disease-drug-news" element={<DiseaseDrugPage />} />
                <Route path="/category/:categoryName" element={<CategoryPage />} />
                <Route path="/article/:articleId" element={<ArticleDetailPage />} />
                <Route path="/med-predict" element={<MedPredictPage />} />
                <Route path="/drug-intel" element={<DrugIntelPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
              </Routes>
            </Suspense>
          </main>
        </div>
        <footer className="app-footer">
          <p>&copy; 2026 HealthPulse. Global Healthcare Intelligence.</p>
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
      </div>
    </ArticlesProvider>
  );
}

export default App;
