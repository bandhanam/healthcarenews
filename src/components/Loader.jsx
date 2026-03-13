import { motion } from 'framer-motion';
import './Loader.css';

function Loader({ message = 'Loading...' }) {
  return (
    <motion.div
      className="loader-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="loader-spinner" />
      <p className="loader-message">{message}</p>
    </motion.div>
  );
}

export default Loader;
