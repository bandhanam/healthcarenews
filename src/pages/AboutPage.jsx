import { motion } from 'framer-motion';
import './AboutPage.css';

function AboutPage() {
  return (
    <motion.div
      className="about-page"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="about-hero">
        <h1>About HealthPulse</h1>
        <p>Your trusted source for global healthcare intelligence</p>
      </div>

      <div className="about-content">
        <section className="about-section">
          <h2>Our Mission</h2>
          <p>
            HealthPulse aggregates and curates healthcare news from trusted sources worldwide.
            We provide real-time insights into diseases, drugs, clinical trials, and healthcare
            policy to help professionals and the public stay informed.
          </p>
        </section>

        <section className="about-section">
          <h2>What We Cover</h2>
          <div className="about-grid">
            <div className="about-card">
              <h3>Pharmaceuticals</h3>
              <p>Drug approvals, clinical trials, and pharmaceutical industry developments.</p>
            </div>
            <div className="about-card">
              <h3>Diseases & Conditions</h3>
              <p>Outbreak tracking, disease research, and treatment breakthroughs.</p>
            </div>
            <div className="about-card">
              <h3>Healthcare Policy</h3>
              <p>Regulation changes, health reform, and policy decisions worldwide.</p>
            </div>
            <div className="about-card">
              <h3>Medical Technology</h3>
              <p>Digital health, medical devices, biotechnology, and innovation.</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Data Sources</h2>
          <p>
            Our news is sourced from reputable healthcare publications, research journals,
            regulatory bodies (FDA, WHO, CDC), and major news outlets. Articles are enriched
            with sentiment analysis, entity extraction, and categorization using advanced NLP.
          </p>
        </section>
      </div>
    </motion.div>
  );
}

export default AboutPage;
