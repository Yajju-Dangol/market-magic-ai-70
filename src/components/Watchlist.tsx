
import React from 'react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Stock } from '@/utils/types';
import { Eye, Loader2 } from 'lucide-react';
import StockCard from './StockCard';
import { motion } from 'framer-motion';

interface WatchlistProps {
  stocks: Stock[];
}

const Watchlist: React.FC<WatchlistProps> = ({ stocks }) => {
  const { watchlistItems, isLoading } = useWatchlist();
  
  // Filter stocks to only include those in the watchlist
  const watchedStocks = stocks.filter(stock => 
    watchlistItems.some(item => item.symbol === stock.symbol)
  );
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (watchedStocks.length === 0) {
    return (
      <div className="text-center py-20 glass-card rounded-xl">
        <Eye className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
        <h3 className="mt-4 text-xl font-medium">Your watchlist is empty</h3>
        <p className="mt-2 text-muted-foreground">
          Add stocks to your watchlist by clicking the "Watch" button on any stock card.
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      className="glass-card p-6 rounded-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-bold mb-6">Your Watchlist</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {watchedStocks.map((stock, index) => (
          <StockCard key={stock.symbol} stock={stock} index={index} />
        ))}
      </div>
    </motion.div>
  );
};

export default Watchlist;
