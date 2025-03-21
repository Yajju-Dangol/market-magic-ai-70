import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { Stock } from '@/utils/types';
import { cn } from '@/lib/utils';
import WatchlistButton from './WatchlistButton';
import { useWatchlist } from '@/hooks/useWatchlist';

interface StockCardProps {
  stock: Stock;
  index: number;
}

const StockCard: React.FC<StockCardProps> = ({ stock, index }) => {
  const { isInWatchlist } = useWatchlist();
  const isWatched = isInWatchlist(stock.symbol);
  
  return (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-100 dark:border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-lg">{stock.symbol}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[180px]" title={stock.name}>
            {stock.name}
          </p>
        </div>
        <WatchlistButton 
          symbol={stock.symbol} 
          name={stock.name} 
          isInWatchlist={isWatched} 
        />
      </div>
      
      {/* Price and change */}
      <div className="flex justify-between items-end mt-4">
        <div>
          <span className="text-2xl font-bold">${stock.price.toFixed(2)}</span>
          <div className={cn(
            "flex items-center mt-1",
            stock.change > 0 ? "text-green-600 dark:text-green-500" : 
            stock.change < 0 ? "text-red-600 dark:text-red-500" : 
            "text-gray-500 dark:text-gray-400"
          )}>
            {stock.change > 0 ? (
              <ArrowUpRight className="h-4 w-4 mr-1" />
            ) : stock.change < 0 ? (
              <ArrowDownRight className="h-4 w-4 mr-1" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-1" />
            )}
            <span className="font-medium">
              {stock.change > 0 ? "+" : ""}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400">Volume</div>
          <div className="font-medium">{stock.volume.toLocaleString()}</div>
        </div>
      </div>
    </motion.div>
  );
};

export default StockCard;
