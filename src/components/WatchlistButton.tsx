
import { useState } from 'react';
import { Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface WatchlistButtonProps {
  symbol: string;
  name: string;
  isInWatchlist: boolean;
}

const WatchlistButton = ({ symbol, name, isInWatchlist }: WatchlistButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const addToWatchlist = async () => {
    try {
      setIsLoading(true);
      
      // For now, using a temporary user_id
      // This should be replaced with actual user's auth ID when auth is implemented
      const tempUserId = '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase
        .from('watchlists')
        .insert({
          user_id: tempUserId,
          symbol,
          name
        });
        
      if (error) {
        throw error;
      }
      
      toast.success(`Added ${symbol} to watchlist`);
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      toast.error('Failed to add to watchlist');
    } finally {
      setIsLoading(false);
    }
  };
  
  const removeFromWatchlist = async () => {
    try {
      setIsLoading(true);
      
      // For now, using a temporary user_id
      const tempUserId = '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('user_id', tempUserId)
        .eq('symbol', symbol);
        
      if (error) {
        throw error;
      }
      
      toast.success(`Removed ${symbol} from watchlist`);
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      toast.error('Failed to remove from watchlist');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={isInWatchlist ? "outline" : "secondary"}
      size="sm"
      className="px-2 h-8"
      onClick={isInWatchlist ? removeFromWatchlist : addToWatchlist}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isInWatchlist ? (
        <>
          <Check className="h-4 w-4 mr-1" />
          <span className="text-xs">Watching</span>
        </>
      ) : (
        <>
          <Plus className="h-4 w-4 mr-1" />
          <span className="text-xs">Watch</span>
        </>
      )}
    </Button>
  );
};

export default WatchlistButton;
