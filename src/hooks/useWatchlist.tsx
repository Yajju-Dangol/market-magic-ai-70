
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WatchlistItem } from '@/utils/types';
import { toast } from 'sonner';

export const useWatchlist = () => {
  const queryClient = useQueryClient();
  // For now, using a temporary user_id until auth is implemented
  const tempUserId = '00000000-0000-0000-0000-000000000000';
  
  // Fetch watchlist items
  const { data: watchlistItems, isLoading, error } = useQuery({
    queryKey: ['watchlist'],
    queryFn: async (): Promise<WatchlistItem[]> => {
      const { data, error } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', tempUserId);
        
      if (error) {
        throw error;
      }
      
      return data || [];
    }
  });
  
  // Setup realtime subscription for watchlist changes
  useEffect(() => {
    const channel = supabase
      .channel('watchlist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',  // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'watchlists'
        },
        (payload) => {
          // Invalidate the watchlist query to refetch data
          queryClient.invalidateQueries({ queryKey: ['watchlist'] });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  // Check if a symbol is in the watchlist
  const isInWatchlist = (symbol: string): boolean => {
    if (!watchlistItems) return false;
    return watchlistItems.some(item => item.symbol === symbol);
  };

  return {
    watchlistItems: watchlistItems || [],
    isLoading,
    error,
    isInWatchlist
  };
};
