
import React from 'react';
import { motion } from 'framer-motion';
import { StockRecommendation as StockRecommendationType } from '../utils/types';

interface StockRecommendationProps {
  recommendation: StockRecommendationType;
  index: number;
}

const StockRecommendation: React.FC<StockRecommendationProps> = ({ recommendation, index }) => {
  const actionColors = {
    buy: 'bg-green-50 border-green-200 text-green-700',
    sell: 'bg-red-50 border-red-200 text-red-700',
    hold: 'bg-yellow-50 border-yellow-200 text-yellow-700'
  };
  
  const timeFrameLabels = {
    short: 'Short-term',
    medium: 'Medium-term',
    long: 'Long-term'
  };
  
  return (
    <motion.div 
      className="glass-card overflow-hidden rounded-xl border border-gray-100"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 + (index * 0.1), duration: 0.5 }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold">{recommendation.symbol}</span>
            <div className={`capitalize px-3 py-1 rounded-full text-xs font-semibold ${actionColors[recommendation.action]}`}>
              {recommendation.action}
            </div>
          </div>
          
          <div className="bg-gray-100 rounded-full h-6 w-20 overflow-hidden">
            <div 
              className={`h-full ${recommendation.action === 'buy' ? 'bg-green-500' : recommendation.action === 'sell' ? 'bg-red-500' : 'bg-yellow-500'}`}
              style={{ width: `${recommendation.confidence}%` }}
            ></div>
          </div>
        </div>
        
        <div className="text-sm mb-3">
          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 font-medium">
            {timeFrameLabels[recommendation.timeFrame]}
          </span>
        </div>
        
        <p className="text-muted-foreground text-sm leading-relaxed">
          {recommendation.reason}
        </p>
      </div>
      
      <div className={`px-5 py-3 border-t ${actionColors[recommendation.action]} bg-opacity-30`}>
        <div className="flex justify-between items-center">
          <div className="text-xs font-medium">
            Confidence Score
          </div>
          <div className="font-bold">
            {recommendation.confidence}%
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StockRecommendation;
