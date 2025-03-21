
import { Stock, StockRecommendation, ApiResponse } from './types';
import axios from 'axios';

const SCRAPE_TOKEN = process.env.VITE_SCRAPE_DO_TOKEN || '';
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || '';
const TARGET_URL = 'https://www.nepsetrading.com/market/stocks';

// Function to scrape stock data
export const scrapeStockData = async (): Promise<ApiResponse> => {
  try {
    const targetUrl = encodeURIComponent(TARGET_URL);
    const response = await axios({
      method: 'GET',
      url: `https://api.scrape.do/?token=${SCRAPE_TOKEN}&url=${targetUrl}`,
      headers: {}
    });

    if (response.status !== 200) {
      return { 
        success: false, 
        error: `Failed to fetch data: Status ${response.status}` 
      };
    }

    // Parse the HTML data
    const stockData = parseStockData(response.data);
    return { success: true, data: stockData };
  } catch (error) {
    console.error('Error scraping stock data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Function to parse the HTML and extract stock data
const parseStockData = (htmlData: string): Stock[] => {
  // This is a simplified example parser
  // In a real implementation, you would use a library like Cheerio to parse the HTML
  // For now, we'll return mock data
  
  // Mock data for development
  return [
    {
      symbol: "NABIL",
      name: "Nabil Bank Limited",
      price: 1250.00,
      change: 25.00,
      changePercent: 2.04,
      volume: 125000,
      high: 1255.00,
      low: 1225.00,
      open: 1230.00,
      previousClose: 1225.00
    },
    {
      symbol: "ADBL",
      name: "Agricultural Development Bank Limited",
      price: 420.00,
      change: -5.00,
      changePercent: -1.18,
      volume: 85000,
      high: 430.00,
      low: 418.00,
      open: 425.00,
      previousClose: 425.00
    },
    {
      symbol: "NICA",
      name: "NIC Asia Bank Limited",
      price: 830.00,
      change: 10.00,
      changePercent: 1.22,
      volume: 95000,
      high: 835.00,
      low: 825.00,
      open: 825.00,
      previousClose: 820.00
    },
    {
      symbol: "NRIC",
      name: "Nepal Reinsurance Company Limited",
      price: 950.00,
      change: 15.00,
      changePercent: 1.60,
      volume: 75000,
      high: 960.00,
      low: 940.00,
      open: 945.00,
      previousClose: 935.00
    },
    {
      symbol: "GBIME",
      name: "Global IME Bank Limited",
      price: 335.00,
      change: -2.00,
      changePercent: -0.59,
      volume: 110000,
      high: 340.00,
      low: 333.00,
      open: 338.00,
      previousClose: 337.00
    }
  ];
};

// Function to get stock recommendations using Gemini AI
export const getStockRecommendations = async (stocks: Stock[]): Promise<StockRecommendation[]> => {
  try {
    // Format stock data for the API
    const stocksData = stocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
      change: stock.change,
      changePercent: stock.changePercent,
      volume: stock.volume,
    }));

    // In a production environment, this would call Gemini API
    // For now, we're mocking the response
    
    // Mock recommendation data for development
    const mockRecommendations: StockRecommendation[] = [
      {
        symbol: "NABIL",
        action: "buy",
        confidence: 85,
        reason: "Strong financials, positive momentum, and upcoming dividend announcement make NABIL an attractive buy option for short-term gains.",
        timeFrame: "short"
      },
      {
        symbol: "NICA",
        action: "hold",
        confidence: 70,
        reason: "While showing positive growth, current market conditions suggest holding NICA until clearer directional signals emerge.",
        timeFrame: "medium"
      },
      {
        symbol: "NRIC",
        action: "buy",
        confidence: 80,
        reason: "Consistently strong performance and recent institutional buying indicate significant upside potential for NRIC in the coming weeks.",
        timeFrame: "short"
      }
    ];

    return mockRecommendations;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
};
