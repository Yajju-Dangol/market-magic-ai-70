
import React from 'react';
import { motion } from 'framer-motion';
import { Stock } from '../utils/types';
import { ArrowUp, ArrowDown, Activity } from 'lucide-react';

interface MarketStatsProps {
  stocks: Stock[];
}

const MarketStats: React.FC<MarketStatsProps> = ({ stocks }) => {
  if (!stocks || stocks.length === 0) {
    return null;
  }

  // Calculate market statistics
  const gainers = stocks.filter(stock => stock.change > 0);
  const losers = stocks.filter(stock => stock.change < 0);
  const unchanged = stocks.filter(stock => stock.change === 0);
  
  const totalVolume = stocks.reduce((sum, stock) => sum + stock.volume, 0);
  
  const averagePrice = stocks.reduce((sum, stock) => sum + stock.price, 0) / stocks.length;
  
  const topGainer = stocks.reduce((prev, current) => 
    (current.changePercent > prev.changePercent) ? current : prev, stocks[0]);
    
  const topLoser = stocks.reduce((prev, current) => 
    (current.changePercent < prev.changePercent) ? current : prev, stocks[0]);

  return (
    <motion.div
      className="glass-card p-5 rounded-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-xl font-bold mb-4">Market Summary</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col items-center p-3 bg-white/50 dark:bg-black/10 rounded-lg">
          <div className="flex items-center gap-2 text-green-600">
            <ArrowUp className="h-4 w-4" />
            <span className="font-medium">Gainers</span>
          </div>
          <span className="text-2xl font-bold">{gainers.length}</span>
        </div>
        
        <div className="flex flex-col items-center p-3 bg-white/50 dark:bg-black/10 rounded-lg">
          <div className="flex items-center gap-2 text-red-600">
            <ArrowDown className="h-4 w-4" />
            <span className="font-medium">Losers</span>
          </div>
          <span className="text-2xl font-bold">{losers.length}</span>
        </div>
        
        <div className="flex flex-col items-center p-3 bg-white/50 dark:bg-black/10 rounded-lg">
          <div className="flex items-center gap-2 text-blue-600">
            <Activity className="h-4 w-4" />
            <span className="font-medium">Volume</span>
          </div>
          <span className="text-xl font-bold">{totalVolume.toLocaleString()}</span>
        </div>
        
        <div className="flex flex-col items-center p-3 bg-white/50 dark:bg-black/10 rounded-lg">
          <div className="flex items-center gap-2 text-purple-600">
            <span className="font-medium">Avg. Price</span>
          </div>
          <span className="text-xl font-bold">{averagePrice.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h3 className="text-sm text-green-700 dark:text-green-400 mb-1">Top Gainer</h3>
          <div className="flex justify-between items-center">
            <span className="font-bold">{topGainer.symbol}</span>
            <span className="text-green-600 font-medium">+{topGainer.changePercent.toFixed(2)}%</span>
          </div>
        </div>
        
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <h3 className="text-sm text-red-700 dark:text-red-400 mb-1">Top Loser</h3>
          <div className="flex justify-between items-center">
            <span className="font-bold">{topLoser.symbol}</span>
            <span className="text-red-600 font-medium">{topLoser.changePercent.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MarketStats;
