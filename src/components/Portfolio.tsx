
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePortfolio } from '@/hooks/usePortfolio';
import { PortfolioStock } from '@/utils/types';

const Portfolio: React.FC = () => {
  const { portfolioItems, isLoading, addStock, removeStock, calculateTotalValue } = usePortfolio();
  const [newStock, setNewStock] = useState<PortfolioStock>({ 
    symbol: '', 
    shares: 0, 
    buyPrice: 0
  });
  
  const handleAddStock = () => {
    if (!newStock.symbol || newStock.shares <= 0 || newStock.buyPrice <= 0) {
      toast.error('Please fill all fields with valid values');
      return;
    }
    
    addStock.mutate({ 
      ...newStock, 
      symbol: newStock.symbol.toUpperCase() 
    });
    
    // Reset form
    setNewStock({ symbol: '', shares: 0, buyPrice: 0 });
  };
  
  const handleRemoveStock = (symbol: string) => {
    removeStock.mutate(symbol);
  };

  return (
    <motion.div
      className="glass-card p-6 rounded-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h2 className="text-2xl font-bold mb-6">My Portfolio</h2>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          type="text"
          placeholder="Symbol"
          value={newStock.symbol}
          onChange={(e) => setNewStock({ ...newStock, symbol: e.target.value })}
          className="flex-1"
        />
        <Input
          type="number"
          placeholder="Shares"
          value={newStock.shares || ''}
          onChange={(e) => setNewStock({ ...newStock, shares: Number(e.target.value) })}
          className="flex-1"
        />
        <Input
          type="number"
          placeholder="Buy Price"
          value={newStock.buyPrice || ''}
          onChange={(e) => setNewStock({ ...newStock, buyPrice: Number(e.target.value) })}
          className="flex-1"
        />
        <Button 
          onClick={handleAddStock} 
          disabled={addStock.isPending}
          className="whitespace-nowrap"
        >
          {addStock.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add Stock
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : portfolioItems.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Shares</TableHead>
                <TableHead>Buy Price</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolioItems.map((stock) => (
                <TableRow key={stock.symbol}>
                  <TableCell className="font-medium">{stock.symbol}</TableCell>
                  <TableCell>{stock.shares}</TableCell>
                  <TableCell>NPR {stock.buyPrice.toFixed(2)}</TableCell>
                  <TableCell>NPR {(stock.shares * stock.buyPrice).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStock(stock.symbol)}
                      disabled={removeStock.isPending}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100"
                    >
                      {removeStock.isPending && removeStock.variables === stock.symbol ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="mt-4 text-right">
            <p className="text-lg">
              <span className="text-muted-foreground">Total Portfolio Value:</span>{' '}
              <span className="font-bold">NPR {calculateTotalValue().toFixed(2)}</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>No stocks in portfolio yet. Add your first stock above.</p>
        </div>
      )}
    </motion.div>
  );
};

export default Portfolio;
