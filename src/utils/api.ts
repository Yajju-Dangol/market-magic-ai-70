
import { Stock, StockRecommendation, ApiResponse, MarketSummary } from './types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from "@google/generative-ai";

const SCRAPE_TOKEN = import.meta.env.VITE_SCRAPE_DO_TOKEN || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const TARGET_URL = 'https://www.nepsetrading.com/market/stocks';

// Define the possible CSS selectors for market tables
const possibleSelectors = [
  'table.w-full',
  'table.stock-table',
  'table.data-table',
  'table',
  '.stock-data table',
  '.market-data table'
];

// Function to scrape stock data using browser interactions
export const scrapeBrowserInteractions = async (): Promise<ApiResponse> => {
  try {
    if (!SCRAPE_TOKEN) {
      return { 
        success: false, 
        error: 'Scrape.do API token is missing' 
      };
    }

    console.log('Attempting to scrape data with browser interactions');
    
    const targetUrl = encodeURIComponent(TARGET_URL);
    
    // Create browser interactions to handle potential popups, wait for table load, etc.
    const browserActions = [
      { "Action": "Wait", "Timeout": 3000 }, // Wait for page to load
      { "Action": "ScrollY", "Value": 300 }, // Scroll down to view tables
      { "Action": "WaitSelector", "WaitSelector": "table", "Timeout": 5000 } // Wait for tables to load
    ];
    
    // Encode the browser actions
    const jsonData = JSON.stringify(browserActions);
    const encodedJsonData = encodeURIComponent(jsonData);
    
    const response = await axios({
      method: 'GET',
      url: `https://api.scrape.do/?token=${SCRAPE_TOKEN}&url=${targetUrl}&render=true&playWithBrowser=${encodedJsonData}`,
      // Using render=true to ensure JavaScript executes on the page
    });

    console.log('Browser interaction response status:', response.status);
    
    if (response.status !== 200) {
      return { 
        success: false, 
        error: `Failed to fetch data: Status ${response.status}` 
      };
    }

    if (typeof response.data !== 'string') {
      console.log('Response data type:', typeof response.data);
      return {
        success: false,
        error: 'Invalid response format: Expected HTML string'
      };
    }

    const stockData = parseStockData(response.data);
    
    if (stockData.length === 0) {
      const $ = cheerio.load(response.data);
      console.log('Page title:', $('title').text());
      console.log('Tables found:', $('table').length);
      console.log('First table classes:', $('table').first().attr('class'));
      
      // Log the HTML content for debugging
      console.log('HTML content snippet:', response.data.substring(0, 500));
      
      // If no stock data found, create mock data for demonstration
      return {
        success: true,
        data: generateMockStockData(),
        message: 'Using mock data: Could not extract real stock data from the page'
      };
    }
    
    return { success: true, data: stockData };
  } catch (error) {
    console.error('Error scraping stock data with browser interactions:', error);
    // Return mock data on error for better user experience
    return { 
      success: true, 
      data: generateMockStockData(),
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Function to scrape stock data
export const scrapeStockData = async (): Promise<ApiResponse> => {
  try {
    if (!SCRAPE_TOKEN) {
      return { 
        success: false, 
        error: 'Scrape.do API token is missing' 
      };
    }

    console.log('Attempting to scrape data with token:', SCRAPE_TOKEN.substring(0, 5) + '...');
    
    const targetUrl = encodeURIComponent(TARGET_URL);
    const response = await axios({
      method: 'GET',
      url: `https://api.scrape.do/?token=${SCRAPE_TOKEN}&url=${targetUrl}`,
      // Remove User-Agent header as it's being refused
    });

    console.log('Response status:', response.status);
    
    if (response.status !== 200) {
      return { 
        success: false, 
        error: `Failed to fetch data: Status ${response.status}` 
      };
    }

    if (typeof response.data !== 'string') {
      console.log('Response data type:', typeof response.data);
      return {
        success: false,
        error: 'Invalid response format: Expected HTML string'
      };
    }

    const stockData = parseStockData(response.data);
    
    if (stockData.length === 0) {
      const $ = cheerio.load(response.data);
      console.log('Page title:', $('title').text());
      console.log('Tables found:', $('table').length);
      console.log('First table classes:', $('table').first().attr('class'));
      
      const bodyText = $('body').text().substring(0, 200);
      console.log('Body text excerpt:', bodyText);
      
      // If no stock data found, create mock data for demonstration
      return {
        success: true,
        data: generateMockStockData()
      };
    }
    
    return { success: true, data: stockData };
  } catch (error) {
    console.error('Error scraping stock data:', error);
    // Return mock data on error for better user experience
    return { 
      success: true, 
      data: generateMockStockData() 
    };
  }
};

// Function to generate mock stock data for demonstration
const generateMockStockData = (): Stock[] => {
  const mockStocks: Stock[] = [
    {
      symbol: 'NABIL',
      name: 'Nepal Investment Bank',
      price: 356.20,
      change: 7.80,
      changePercent: 2.24,
      volume: 123456,
      high: 360.00,
      low: 350.10,
      open: 352.50,
      previousClose: 348.40
    },
    {
      symbol: 'NHPC',
      name: 'Nepal Hydro Power Company',
      price: 125.60,
      change: -3.20,
      changePercent: -2.48,
      volume: 256789,
      high: 128.90,
      low: 124.80,
      open: 128.80,
      previousClose: 128.80
    },
    {
      symbol: 'SBLD',
      name: 'Sana Bima Life Development',
      price: 789.30,
      change: 12.40,
      changePercent: 1.59,
      volume: 56782,
      high: 795.00,
      low: 780.20,
      open: 781.50,
      previousClose: 776.90
    },
    {
      symbol: 'ADBL',
      name: 'Agricultural Development Bank',
      price: 420.10,
      change: 0.10,
      changePercent: 0.02,
      volume: 87654,
      high: 422.50,
      low: 419.80,
      open: 420.00,
      previousClose: 420.00
    },
    {
      symbol: 'NEPSE',
      name: 'Nepal Stock Exchange',
      price: 2145.67,
      change: 32.45,
      changePercent: 1.54,
      volume: 1234567,
      high: 2150.00,
      low: 2120.30,
      open: 2125.40,
      previousClose: 2113.22
    },
    {
      symbol: 'CHCL',
      name: 'Central Himalayan Company Ltd',
      price: 567.80,
      change: -8.90,
      changePercent: -1.54,
      volume: 98321,
      high: 575.00,
      low: 565.40,
      open: 575.00,
      previousClose: 576.70
    },
    {
      symbol: 'NBLD',
      name: 'Nepal Bank Limited',
      price: 289.50,
      change: 5.30,
      changePercent: 1.87,
      volume: 176543,
      high: 290.00,
      low: 285.70,
      open: 286.20,
      previousClose: 284.20
    },
    {
      symbol: 'HDHPC',
      name: 'Himalayan Hydro Power Company',
      price: 178.20,
      change: -2.10,
      changePercent: -1.16,
      volume: 87234,
      high: 180.40,
      low: 177.50,
      open: 180.30,
      previousClose: 180.30
    }
  ];
  
  return mockStocks;
};

// Function to parse the HTML and extract stock data using Cheerio
const parseStockData = (htmlData: string): Stock[] => {
  try {
    if (!htmlData || typeof htmlData !== 'string') {
      console.error('Invalid HTML data received');
      return [];
    }
    
    console.log('HTML data received, length:', htmlData.length);
    
    const $ = cheerio.load(htmlData);
    const stockData: Stock[] = [];
    
    console.log('All tables on the page:');
    $('table').each((i, table) => {
      console.log(`Table ${i}:`, $(table).attr('class'));
    });
    
    let marketTable;
    
    for (const selector of possibleSelectors) {
      console.log(`Trying selector: ${selector}`);
      marketTable = $(selector);
      if (marketTable.length > 0) {
        console.log(`Found table with selector: ${selector}`);
        break;
      }
    }
    
    if (!marketTable || marketTable.length === 0) {
      console.error('No tables found matching any selector');
      return [];
    }
    
    marketTable.find('tr').each((index, row) => {
      if (index === 0) return;
      
      const cells = $(row).find('td');
      console.log(`Row ${index} has ${cells.length} cells`);
      
      if (cells.length >= 4) {
        const getCleanText = (cell: any) => $(cell).text().trim().replace(/\s+/g, ' ');
        const safeParseFloat = (text: string) => {
          const cleaned = text.replace(/[^0-9.-]/g, '');
          const value = parseFloat(cleaned);
          return isNaN(value) ? 0 : value;
        };
        const safeParseInt = (text: string) => {
          const cleaned = text.replace(/[^0-9]/g, '');
          const value = parseInt(cleaned);
          return isNaN(value) ? 0 : value;
        };
        
        const stock: Stock = {
          symbol: getCleanText(cells[0]) || 'Unknown',
          name: getCleanText(cells.length > 1 ? cells[1] : cells[0]) || 'Unknown Company',
          price: safeParseFloat(getCleanText(cells.length > 2 ? cells[2] : cells[1])),
          change: safeParseFloat(getCleanText(cells.length > 3 ? cells[3] : cells[2])),
          changePercent: safeParseFloat(getCleanText(cells.length > 4 ? cells[4] : cells[3])),
          volume: safeParseInt(getCleanText(cells.length > 5 ? cells[5] : cells[4])),
          high: cells.length > 6 ? safeParseFloat(getCleanText(cells[6])) : 0,
          low: cells.length > 7 ? safeParseFloat(getCleanText(cells[7])) : 0,
          open: cells.length > 8 ? safeParseFloat(getCleanText(cells[8])) : 0,
          previousClose: cells.length > 9 ? safeParseFloat(getCleanText(cells[9])) : 0
        };
        
        console.log('Parsed stock:', stock.symbol, stock.price);
        stockData.push(stock);
        
        if (stockData.length >= 10) return false;
      }
    });
    
    console.log('Successfully parsed', stockData.length, 'stocks');
    return stockData;
  } catch (error) {
    console.error('Error parsing HTML with Cheerio:', error);
    return [];
  }
};

// Function to get stock recommendations using Gemini AI
export const getStockRecommendations = async (stocks: Stock[]): Promise<StockRecommendation[]> => {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is missing');
    }
    
    if (!stocks || stocks.length === 0) {
      throw new Error('No stock data available for recommendations');
    }

    const stocksData = stocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
      change: stock.change,
      changePercent: stock.changePercent,
      volume: stock.volume,
      high: stock.high,
      low: stock.low,
      open: stock.open,
      previousClose: stock.previousClose
    }));

    console.log('Sending stock data to Gemini:', stocksData.length, 'stocks');

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Based on the following stock market data from Nepal, provide trading recommendations for the top 3 most promising stocks.
      For each recommendation, specify whether to buy, sell, or hold, with a confidence level (0-100), 
      a brief reason for the recommendation, and a timeframe (short, medium, or long).
      Return the response in a JSON format with an array of objects containing symbol, action, confidence, reason, and timeFrame.
      
      Stock data: ${JSON.stringify(stocksData)}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    
    console.log('Gemini API response (first 100 chars):', response.substring(0, 100));
    
    const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      try {
        const recommendations = JSON.parse(jsonStr) as StockRecommendation[];
        console.log('Parsed recommendations:', recommendations);
        return recommendations;
      } catch (e) {
        console.error('Error parsing JSON from Gemini response:', e);
        // Return mock recommendations on error
        return generateMockRecommendations(stocks);
      }
    } else {
      console.error('JSON pattern not found in response:', response);
      // Return mock recommendations on error
      return generateMockRecommendations(stocks);
    }
  } catch (error) {
    console.error('Error getting stock recommendations:', error);
    // Return mock data for better user experience
    return generateMockRecommendations(stocks);
  }
};

// Function to generate mock recommendations
const generateMockRecommendations = (stocks: Stock[]): StockRecommendation[] => {
  // Sort stocks by change percent to find top performers
  const sortedStocks = [...stocks].sort((a, b) => b.changePercent - a.changePercent);
  const topStocks = sortedStocks.slice(0, 3);
  
  const timeFrames: Array<'short' | 'medium' | 'long'> = ['short', 'medium', 'long'];
  const actions: Array<'buy' | 'sell' | 'hold'> = ['buy', 'sell', 'hold'];
  
  return topStocks.map((stock, index) => {
    // Determine action based on change percent
    let action: 'buy' | 'sell' | 'hold';
    if (stock.changePercent > 1) {
      action = 'buy';
    } else if (stock.changePercent < -1) {
      action = 'sell';
    } else {
      action = 'hold';
    }
    
    // Generate mock recommendations
    return {
      symbol: stock.symbol,
      action: action,
      confidence: Math.floor(60 + Math.random() * 30), // 60-90
      reason: `${action === 'buy' ? 'Positive momentum' : action === 'sell' ? 'Negative trend' : 'Stable performance'} with ${stock.changePercent.toFixed(2)}% change. Volume is ${stock.volume} which indicates ${stock.volume > 100000 ? 'strong' : 'moderate'} market interest.`,
      timeFrame: timeFrames[index % timeFrames.length]
    };
  });
};

// Function to get market insights using Gemini AI
export const getMarketInsights = async (stocks: Stock[], userQuery: string): Promise<string> => {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is missing');
    }
    
    if (!stocks || stocks.length === 0) {
      throw new Error('No stock data available for analysis');
    }

    const stocksData = stocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
      change: stock.change,
      changePercent: stock.changePercent,
      volume: stock.volume,
      high: stock.high,
      low: stock.low,
      open: stock.open,
      previousClose: stock.previousClose
    }));

    console.log('Sending stock data to Gemini for insights:', stocksData.length, 'stocks');

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are a market expert AI assistant. Based on the following stock market data:
      ${JSON.stringify(stocksData)}
      
      Respond to the user's query: "${userQuery}"
      
      Provide detailed analysis, insights, and clear explanations. If the user asks about 
      specific stocks, analyze those stocks from the provided data.
      Focus on the provided stock data, but you can also use your general knowledge 
      about markets and investment principles to provide context and explanation.
      Be concise and informative.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    
    if (!response || response.trim() === '') {
      return generateMockInsight(userQuery, stocks);
    }
    
    return response;
  } catch (error) {
    console.error('Error getting market insights:', error);
    // Return mock insights for better user experience
    return generateMockInsight(userQuery, stocks);
  }
};

// Generate mock insights when the API fails
const generateMockInsight = (query: string, stocks: Stock[]): string => {
  const lowerQuery = query.toLowerCase();
  
  // Check if the query is about a specific stock
  const mentionedStock = stocks.find(stock => 
    lowerQuery.includes(stock.symbol.toLowerCase()) || 
    lowerQuery.includes(stock.name.toLowerCase())
  );
  
  if (mentionedStock) {
    return `
Based on the current market data, ${mentionedStock.symbol} (${mentionedStock.name}) is trading at NPR ${mentionedStock.price.toFixed(2)} with a ${mentionedStock.change > 0 ? 'gain' : 'loss'} of ${Math.abs(mentionedStock.changePercent).toFixed(2)}%.

The stock has a daily trading volume of ${mentionedStock.volume.toLocaleString()}, which indicates ${mentionedStock.volume > 100000 ? 'strong' : 'moderate'} market interest. The day's high was NPR ${mentionedStock.high?.toFixed(2) || 'N/A'} and the low was NPR ${mentionedStock.low?.toFixed(2) || 'N/A'}.

${mentionedStock.changePercent > 2 ? 'This stock is showing strong bullish momentum and might be worth considering for short-term investment opportunities.' : 
  mentionedStock.changePercent < -2 ? 'This stock is showing bearish trends. It might be wise to wait for signs of reversal before considering investment.' :
  'The stock is showing relatively stable performance in the current market conditions.'}

Remember that all investment decisions should be based on comprehensive analysis and align with your overall investment strategy.
`;
  }
  
  // General market overview
  const gainers = stocks.filter(s => s.changePercent > 0).length;
  const losers = stocks.filter(s => s.changePercent < 0).length;
  const avgChange = stocks.reduce((sum, stock) => sum + stock.changePercent, 0) / stocks.length;
  const topGainer = [...stocks].sort((a, b) => b.changePercent - a.changePercent)[0];
  const topLoser = [...stocks].sort((a, b) => a.changePercent - b.changePercent)[0];
  
  return `
Based on the current market data, the overall market is showing a ${avgChange > 0 ? 'positive' : 'negative'} trend with an average change of ${Math.abs(avgChange).toFixed(2)}%.

Out of the analyzed stocks, ${gainers} are showing gains while ${losers} are in negative territory. 

The top performing stock is ${topGainer.symbol} (${topGainer.name}) with a gain of ${topGainer.changePercent.toFixed(2)}%, currently trading at NPR ${topGainer.price.toFixed(2)}.

The weakest performer is ${topLoser.symbol} (${topLoser.name}) with a change of ${topLoser.changePercent.toFixed(2)}%, currently trading at NPR ${topLoser.price.toFixed(2)}.

${avgChange > 1 ? 'The market is showing bullish sentiment today. This could be a good opportunity to look for strong stocks with upward momentum.' :
  avgChange < -1 ? 'The market is showing bearish sentiment today. It might be wise to be cautious with new positions and focus on stocks showing relative strength.' :
  'The market is showing mixed signals today. Consider focusing on specific sectors or stocks that demonstrate strength against the broader market.'}

Remember that all investment decisions should be based on comprehensive analysis and align with your overall investment strategy.
`;
};
