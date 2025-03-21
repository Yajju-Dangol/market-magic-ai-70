
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PortfolioStock } from '@/utils/types';
import { toast } from 'sonner';

export const usePortfolio = () => {
  const queryClient = useQueryClient();
  // For now, using a temporary user_id until auth is implemented
  const tempUserId = '00000000-0000-0000-0000-000000000000';
  
  // Fetch portfolio items
  const { data: portfolioItems, isLoading, error } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async (): Promise<PortfolioStock[]> => {
      const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', tempUserId);
        
      if (error) {
        throw error;
      }
      
      return data?.map(item => ({
        symbol: item.symbol,
        shares: Number(item.shares),
        buyPrice: Number(item.buy_price),
        purchaseDate: item.purchase_date
      })) || [];
    }
  });

  // Add stock to portfolio
  const addStock = useMutation({
    mutationFn: async (stock: PortfolioStock) => {
      const { data, error } = await supabase
        .from('portfolio')
        .upsert({
          user_id: tempUserId,
          symbol: stock.symbol,
          shares: stock.shares,
          buy_price: stock.buyPrice,
          purchase_date: stock.purchaseDate || new Date().toISOString().split('T')[0]
        }, {
          onConflict: 'user_id,symbol',
          ignoreDuplicates: false
        });
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      toast.success('Stock added to portfolio');
    },
    onError: (error) => {
      console.error('Error adding stock to portfolio:', error);
      toast.error('Failed to add stock to portfolio');
    }
  });

  // Remove stock from portfolio
  const removeStock = useMutation({
    mutationFn: async (symbol: string) => {
      const { error } = await supabase
        .from('portfolio')
        .delete()
        .eq('user_id', tempUserId)
        .eq('symbol', symbol);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      toast.success('Stock removed from portfolio');
    },
    onError: (error) => {
      console.error('Error removing stock from portfolio:', error);
      toast.error('Failed to remove stock from portfolio');
    }
  });
  
  // Setup realtime subscription for portfolio changes
  useEffect(() => {
    const channel = supabase
      .channel('portfolio-changes')
      .on(
        'postgres_changes',
        {
          event: '*',  // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'portfolio'
        },
        (payload) => {
          // Invalidate the portfolio query to refetch data
          queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculate total portfolio value
  const calculateTotalValue = () => {
    if (!portfolioItems) return 0;
    return portfolioItems.reduce((total, stock) => total + (stock.shares * stock.buyPrice), 0);
  };

  return {
    portfolioItems: portfolioItems || [],
    isLoading,
    error,
    addStock,
    removeStock,
    calculateTotalValue
  };
};
