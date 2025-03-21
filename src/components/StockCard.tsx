
import React from 'react';
import { motion } from 'framer-motion';
import { Stock } from '../utils/types';

interface StockCardProps {
  stock: Stock;
  index: number;
}

const StockCard: React.FC<StockCardProps> = ({ stock, index }) => {
  const isPositive = stock.change >= 0;
  
  return (
    <motion.div 
      className="neo-card p-5 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ 
        y: -5,
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
        transition: { duration: 0.2 }
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{stock.symbol}</p>
          <h3 className="font-bold text-lg">{stock.name}</h3>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(stock.changePercent).toFixed(2)}%
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold">{stock.price.toLocaleString()}</p>
          <p className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{stock.change.toFixed(2)}
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Volume</p>
          <p className="font-medium">{stock.volume.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Open</p>
          <p className="font-medium">{stock.open?.toLocaleString() || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Prev Close</p>
          <p className="font-medium">{stock.previousClose?.toLocaleString() || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">High</p>
          <p className="font-medium">{stock.high?.toLocaleString() || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Low</p>
          <p className="font-medium">{stock.low?.toLocaleString() || '-'}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default StockCard;
