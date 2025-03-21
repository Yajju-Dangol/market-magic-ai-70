
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import StockCard from '../components/StockCard';
import StockRecommendation from '../components/StockRecommendation';
import LoadingSpinner from '../components/LoadingSpinner';
import { scrapeStockData, getStockRecommendations } from '../utils/api';
import { Stock, StockRecommendation as StockRecommendationType } from '../utils/types';
import { toast } from 'sonner';

const Index: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [recommendations, setRecommendations] = useState<StockRecommendationType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch stock data
        const stockResponse = await scrapeStockData();
        
        if (!stockResponse.success) {
          throw new Error(stockResponse.error || 'Failed to fetch stock data');
        }
        
        const stocksData = stockResponse.data as Stock[];
        if (!stocksData || stocksData.length === 0) {
          throw new Error('No stock data available');
        }
        
        setStocks(stocksData);
        
        // Get AI recommendations based on the stock data
        try {
          const recommendationsData = await getStockRecommendations(stocksData);
          setRecommendations(recommendationsData);
        } catch (recError) {
          console.error('Error getting recommendations:', recError);
          // We will still show the stocks even if recommendations fail
          toast.error('Failed to load AI recommendations', {
            description: 'Stock data was loaded successfully, but AI recommendations failed.',
          });
        }
        
        toast.success('Data loaded successfully', {
          description: 'Stock data has been updated.',
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data. Please try again later.');
        toast.error('Failed to load data', {
          description: 'Please check your connection and try again.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up periodic refresh (every 5 minutes)
    const intervalId = setInterval(fetchData, 5 * 60 * 1000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Background element */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute top-1/2 -left-24 w-80 h-80 bg-cyan-100 rounded-full blur-3xl opacity-30"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header />
        
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-20">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-muted-foreground animate-pulse">Loading stock data...</p>
          </div>
        ) : error ? (
          <div className="text-center mt-20 glass-card p-8 max-w-md mx-auto">
            <svg 
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-red-500 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
            <h3 className="text-xl font-bold mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-6"
          >
            {/* Header Section */}
            <motion.div 
              className="mb-12 text-center max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                AI-Powered Stock Signals
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Get intelligent stock recommendations based on real-time market data and AI analysis
              </p>
              <motion.div 
                className="inline-block" 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <button className="bg-primary text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all">
                  Analyze Your Portfolio
                </button>
              </motion.div>
            </motion.div>
            
            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Stock Cards */}
              <div className="lg:col-span-2">
                <motion.div 
                  className="glass-card p-6 rounded-xl mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Market Overview</h2>
                    <div className="text-sm text-muted-foreground">
                      Last updated: {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {stocks.map((stock, index) => (
                      <StockCard key={stock.symbol} stock={stock} index={index} />
                    ))}
                  </div>
                </motion.div>
              </div>
              
              {/* Right Column - Recommendations */}
              <div>
                <motion.div 
                  className="glass-card p-6 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">AI Signals</h2>
                    <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      Powered by AI
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    {recommendations.length > 0 ? (
                      recommendations.map((recommendation, index) => (
                        <StockRecommendation 
                          key={recommendation.symbol} 
                          recommendation={recommendation}
                          index={index}
                        />
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-muted-foreground">No recommendations available</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Footer */}
      <motion.footer 
        className="text-center py-8 text-sm text-muted-foreground mt-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <p>© 2023 StockSignals AI. All stock data is for demonstration purposes only.</p>
        <p className="mt-1">Not financial advice. Trading involves risk.</p>
      </motion.footer>
    </div>
  );
};

export default Index;
