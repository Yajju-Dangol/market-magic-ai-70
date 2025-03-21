
import React from 'react';
import { motion } from 'framer-motion';

const Header: React.FC = () => {
  return (
    <motion.header 
      className="w-full py-6 px-8 flex justify-between items-center glass-card mb-8 z-10"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="flex items-center space-x-3"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <div className="bg-gradient-to-r from-blue-500 to-cyan-400 w-10 h-10 rounded-lg flex items-center justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <h1 className="font-bold text-2xl tracking-tight">StockSignals</h1>
          <p className="text-xs text-muted-foreground">AI-Powered Trading Insights</p>
        </div>
      </motion.div>
      
      <motion.nav 
        className="hidden md:flex items-center space-x-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <a href="#" className="font-medium hover:text-primary transition-colors">Dashboard</a>
        <a href="#" className="font-medium hover:text-primary transition-colors">Watchlist</a>
        <a href="#" className="font-medium hover:text-primary transition-colors">Signals</a>
        <a href="#" className="font-medium hover:text-primary transition-colors">About</a>
      </motion.nav>
      
      <motion.button 
        className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Get Started
      </motion.button>
    </motion.header>
  );
};

export default Header;
