
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw, FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Stock } from '@/utils/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getMarketInsights, scrapeBrowserInteractions } from '@/utils/api';

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you analyze the current market data and provide insights. What would you like to know about the stocks? You can also ask me to "scrape latest data" to get the most up-to-date information.',
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
      // Check if the user is asking to scrape or get fresh data
      if (inputMessage.toLowerCase().includes('scrape') || 
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
        const response = await getMarketInsights(stocks, inputMessage);
        
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
            placeholder="Ask about market trends, stock analysis, or investment ideas. Try 'Scrape latest data'..."
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
            Try asking: "Scrape latest stock data" or "Which stocks should I buy right now?"
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
