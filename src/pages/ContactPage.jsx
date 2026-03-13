import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import './ContactPage.css';

function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Thank you! Your message has been sent.');
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <motion.div
      className="contact-page"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="contact-hero">
        <h1>Contact Us</h1>
        <p>Have questions, feedback, or partnership inquiries? Get in touch.</p>
      </div>

      <div className="contact-grid">
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Your name" />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="your@email.com" />
          </div>
          <div className="form-field">
            <label>Message</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required placeholder="Your message..." rows={5} />
          </div>
          <button type="submit" className="contact-submit">Send Message</button>
        </form>

        <div className="contact-info">
          <div className="info-card">
            <h3>Email</h3>
            <p>contact@healthpulse.news</p>
          </div>
          <div className="info-card">
            <h3>Location</h3>
            <p>Global Healthcare Intelligence Platform</p>
          </div>
          <div className="info-card">
            <h3>Response Time</h3>
            <p>We typically respond within 24 hours</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ContactPage;
