
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PortfolioStock {
  symbol: string;
  shares: number;
  buyPrice: number;
}

const Portfolio: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioStock[]>([]);
  const [newStock, setNewStock] = useState({ symbol: '', shares: 0, buyPrice: 0 });
  
  useEffect(() => {
    // Load portfolio from localStorage
    const savedPortfolio = localStorage.getItem('portfolio');
    if (savedPortfolio) {
      try {
        setPortfolio(JSON.parse(savedPortfolio));
      } catch (error) {
        console.error('Error loading portfolio:', error);
      }
    }
  }, []);
  
  // Save portfolio to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
  }, [portfolio]);
  
  const handleAddStock = () => {
    if (!newStock.symbol || newStock.shares <= 0 || newStock.buyPrice <= 0) {
      toast.error('Please fill all fields with valid values');
      return;
    }
    
    // Check if stock already exists in portfolio
    const existingIndex = portfolio.findIndex(
      stock => stock.symbol.toUpperCase() === newStock.symbol.toUpperCase()
    );
    
    if (existingIndex >= 0) {
      // Update existing stock
      const updatedPortfolio = [...portfolio];
      updatedPortfolio[existingIndex] = {
        ...updatedPortfolio[existingIndex],
        shares: updatedPortfolio[existingIndex].shares + newStock.shares,
        buyPrice: (updatedPortfolio[existingIndex].buyPrice + newStock.buyPrice) / 2
      };
      setPortfolio(updatedPortfolio);
    } else {
      // Add new stock
      setPortfolio([...portfolio, {
        symbol: newStock.symbol.toUpperCase(),
        shares: newStock.shares,
        buyPrice: newStock.buyPrice
      }]);
    }
    
    // Reset form
    setNewStock({ symbol: '', shares: 0, buyPrice: 0 });
    toast.success('Stock added to portfolio');
  };
  
  const handleRemoveStock = (index: number) => {
    const updatedPortfolio = [...portfolio];
    updatedPortfolio.splice(index, 1);
    setPortfolio(updatedPortfolio);
    toast.success('Stock removed from portfolio');
  };
  
  const calculateTotalValue = () => {
    return portfolio.reduce((total, stock) => total + (stock.shares * stock.buyPrice), 0);
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
        <Button onClick={handleAddStock} className="whitespace-nowrap">
          <Plus className="mr-2 h-4 w-4" /> Add Stock
        </Button>
      </div>
      
      {portfolio.length > 0 ? (
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
              {portfolio.map((stock, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{stock.symbol}</TableCell>
                  <TableCell>{stock.shares}</TableCell>
                  <TableCell>{stock.buyPrice.toFixed(2)}</TableCell>
                  <TableCell>{(stock.shares * stock.buyPrice).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStock(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="mt-4 text-right">
            <p className="text-lg">
              <span className="text-muted-foreground">Total Portfolio Value:</span>{' '}
              <span className="font-bold">{calculateTotalValue().toFixed(2)}</span>
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
