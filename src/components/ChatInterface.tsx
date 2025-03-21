
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw, FileSearch, List, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Stock } from '@/utils/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getMarketInsights, scrapeBrowserInteractions } from '@/utils/api';
import { useWatchlist } from '@/hooks/useWatchlist';
import { usePortfolio } from '@/hooks/usePortfolio';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  stocks: Stock[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ stocks }) => {
  const { watchlistItems } = useWatchlist();
  const { portfolioItems } = usePortfolio();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you analyze the current market data and provide insights. What would you like to know about the stocks? You can ask about your watchlist, your portfolio, or request me to "scrape latest data" to get the most up-to-date information.',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      // Check if the user is asking about their portfolio
      if (inputMessage.toLowerCase().includes('portfolio') || 
          inputMessage.toLowerCase().includes('my stocks') ||
          inputMessage.toLowerCase().includes('my holdings') ||
          inputMessage.toLowerCase().includes('i own')) {
        
        if (portfolioItems.length === 0) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Your portfolio is currently empty. You can add stocks to your portfolio in the Portfolio tab.',
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          // Get current prices for portfolio stocks if available
          const portfolioWithCurrentPrices = portfolioItems.map(portfolioStock => {
            const currentStockData = stocks.find(s => s.symbol === portfolioStock.symbol);
            return {
              ...portfolioStock,
              currentPrice: currentStockData?.price || null,
              priceChange: currentStockData ? currentStockData.price - portfolioStock.buyPrice : null,
              priceChangePercent: currentStockData 
                ? ((currentStockData.price - portfolioStock.buyPrice) / portfolioStock.buyPrice) * 100 
                : null
            };
          });
          
          // Calculate total value and gain/loss
          const totalInvestment = portfolioItems.reduce(
            (sum, stock) => sum + stock.shares * stock.buyPrice, 0
          );
          
          const currentValue = portfolioWithCurrentPrices.reduce(
            (sum, stock) => sum + stock.shares * (stock.currentPrice || stock.buyPrice), 0
          );
          
          const totalGainLoss = currentValue - totalInvestment;
          const totalGainLossPercent = (totalGainLoss / totalInvestment) * 100;
          
          // Create a message with portfolio information
          let portfolioText = `Here's your current portfolio summary:\n\n`;
          
          portfolioWithCurrentPrices.forEach(stock => {
            const currentPriceText = stock.currentPrice 
              ? `Current price: $${stock.currentPrice.toFixed(2)} (${stock.priceChangePercent && stock.priceChangePercent > 0 ? '+' : ''}${stock.priceChangePercent?.toFixed(2) || 'N/A'}%)` 
              : 'Current price not available';
              
            portfolioText += `${stock.symbol}: ${stock.shares} shares at $${stock.buyPrice.toFixed(2)} per share. ${currentPriceText}\n`;
            
            if (stock.currentPrice) {
              const stockValue = stock.shares * stock.currentPrice;
              const stockCost = stock.shares * stock.buyPrice;
              const stockGainLoss = stockValue - stockCost;
              portfolioText += `Total value: $${stockValue.toFixed(2)} (${stockGainLoss > 0 ? '+' : ''}$${stockGainLoss.toFixed(2)})\n`;
            } else {
              portfolioText += `Total cost: $${(stock.shares * stock.buyPrice).toFixed(2)}\n`;
            }
            
            portfolioText += `\n`;
          });
          
          portfolioText += `Total portfolio cost: $${totalInvestment.toFixed(2)}\n`;
          
          if (portfolioWithCurrentPrices.some(s => s.currentPrice)) {
            portfolioText += `Current portfolio value: $${currentValue.toFixed(2)}\n`;
            portfolioText += `Overall gain/loss: ${totalGainLoss > 0 ? '+' : ''}$${totalGainLoss.toFixed(2)} (${totalGainLossPercent > 0 ? '+' : ''}${totalGainLossPercent.toFixed(2)}%)\n`;
          }
          
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: portfolioText,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, assistantMessage]);
        }
      }
      // Check if the user is asking about their watchlist
      else if (inputMessage.toLowerCase().includes('watchlist') || 
          inputMessage.toLowerCase().includes('watching')) {
        
        if (watchlistItems.length === 0) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Your watchlist is currently empty. You can add stocks to your watchlist by clicking the "Watch" button on any stock card in the Market or AI Signals tabs.',
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          // Filter stocks to only include those in the watchlist
          const watchedStocks = stocks.filter(stock => 
            watchlistItems.some(item => item.symbol === stock.symbol)
          );
          
          // Create a message with watchlist information
          const watchlistText = watchedStocks.map(stock => 
            `${stock.symbol} (${stock.name}): $${stock.price.toFixed(2)} (${stock.change > 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%)`
          ).join('\n');
          
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Here are the stocks in your watchlist:\n\n${watchlistText}\n\nWhat specific information would you like about these stocks?`,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, assistantMessage]);
        }
      }
      // Check if the user is asking to scrape or get fresh data
      else if (inputMessage.toLowerCase().includes('scrape') || 
          inputMessage.toLowerCase().includes('get data') || 
          inputMessage.toLowerCase().includes('fresh data') ||
          inputMessage.toLowerCase().includes('get latest') ||
          inputMessage.toLowerCase().includes('update') ||
          inputMessage.toLowerCase().includes('latest stock')) {
        
        // If user wants to scrape, use the browser interaction method
        const scrapingMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Fetching the latest stock data from the website. This might take a moment...',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, scrapingMessage]);
        setIsScraping(true);
        
        const result = await scrapeBrowserInteractions();
        setIsScraping(false);
        
        // Add response about scraping result
        const responseMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: result.success 
            ? `Successfully scraped ${result.data?.length || 0} stocks from the website. ${result.error ? `Note: ${result.error}` : ''} You can now ask questions about the latest market data.` 
            : `Sorry, I encountered an issue while scraping: ${result.error}. I'll use the available data for analysis instead.`,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, responseMessage]);
      } else {
        // Normal AI response for market insights
        // Include watchlist and portfolio information in the query to make the AI aware of them
        const watchlistInfo = watchlistItems.length > 0 
          ? `The user has the following stocks in their watchlist: ${watchlistItems.map(item => item.symbol).join(', ')}.` 
          : 'The user has no stocks in their watchlist.';
          
        const portfolioInfo = portfolioItems.length > 0
          ? `The user has the following stocks in their portfolio: ${portfolioItems.map(item => `${item.symbol} (${item.shares} shares at ${item.buyPrice})`).join(', ')}.`
          : 'The user has no stocks in their portfolio.';
        
        const response = await getMarketInsights(stocks, `${watchlistInfo} ${portfolioInfo} ${inputMessage}`);
        
        // Add assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error getting market insights:', error);
      toast.error('Failed to get market insights', {
        description: 'Please try again later',
      });
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while analyzing the market data. Please try again later.',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[70vh] glass-card rounded-xl overflow-hidden">
      <div className="bg-primary/10 p-4 border-b">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bot size={20} /> Market AI Assistant
        </h2>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <div className="flex items-center">
            <List size={14} className="mr-1" />
            <span>Watching {watchlistItems.length} stocks</span>
          </div>
          <div className="flex items-center">
            <Briefcase size={14} className="mr-1" />
            <span>Portfolio: {portfolioItems.length} stocks</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 p-4 rounded-lg max-w-[85%]",
              message.role === 'user' 
                ? "ml-auto bg-primary text-primary-foreground" 
                : "bg-muted"
            )}
          >
            <div className="flex-shrink-0 mt-1">
              {message.role === 'user' ? (
                <User size={18} />
              ) : (
                <Bot size={18} />
              )}
            </div>
            <div>
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs mt-2 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 p-4 rounded-lg bg-muted max-w-[85%]">
            <div className="flex-shrink-0 mt-1">
              <Bot size={18} />
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="animate-spin" />
              {isScraping ? 'Scraping stock data from website...' : 'Analyzing market data...'}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            placeholder="Ask about market trends, your watchlist, portfolio, or investment ideas..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="resize-none"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !inputMessage.trim()}
            size="icon"
            title="Send message"
          >
            <Send size={18} />
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileSearch size={12} />
            Try asking: "Show my portfolio", "What's in my watchlist?" or "Which stocks should I buy right now?"
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
