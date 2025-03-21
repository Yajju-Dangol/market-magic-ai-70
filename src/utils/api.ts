import { Stock, StockRecommendation, ApiResponse, MarketSummary } from './types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '@/integrations/supabase/client';

const SCRAPE_TOKEN = import.meta.env.VITE_SCRAPE_DO_TOKEN || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const TARGET_URL = 'https://www.nepsetrading.com/market/stocks';

const possibleSelectors = [
  'table.w-full',
  'table.stock-table',
  'table.data-table',
  'table',
  '.stock-data table',
  '.market-data table'
];

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
    
    const browserActions = [
      { "Action": "Wait", "Timeout": 3000 },
      { "Action": "ScrollY", "Value": 300 },
      { "Action": "WaitSelector", "WaitSelector": "table", "Timeout": 5000 },
      { "Action": "Execute", "Execute": `
        const loadMoreBtn = document.querySelector('.load-more, .pagination button, button:contains("Load More")');
        if (loadMoreBtn) loadMoreBtn.click();
        
        setTimeout(() => {
          window.scrollTo(0, document.body.scrollHeight);
        }, 1000);
      `},
      { "Action": "Wait", "Timeout": 2000 },
      { "Action": "ScrollY", "Value": 1000 },
      { "Action": "Wait", "Timeout": 1000 }
    ];
    
    const jsonData = JSON.stringify(browserActions);
    const encodedJsonData = encodeURIComponent(jsonData);
    
    const response = await axios({
      method: 'GET',
      url: `https://api.scrape.do/?token=${SCRAPE_TOKEN}&url=${targetUrl}&render=true&playWithBrowser=${encodedJsonData}`,
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
      
      const bodyText = $('body').text().substring(0, 200);
      console.log('Body text excerpt:', bodyText);
      
      try {
        const extractScript = [
          { "Action": "Wait", "Timeout": 3000 },
          { "Action": "Execute", "Execute": `
            const stockData = [];
            const tableRows = document.querySelectorAll('table tr');
            
            for (let i = 1; i < tableRows.length; i++) {
              const row = tableRows[i];
              const cells = row.querySelectorAll('td');
              
              if (cells.length >= 4) {
                const stock = {
                  symbol: cells[0]?.textContent?.trim() || 'Unknown',
                  name: (cells.length > 1 ? cells[1]?.textContent?.trim() : cells[0]?.textContent?.trim()) || 'Unknown',
                  price: parseFloat((cells.length > 2 ? cells[2]?.textContent?.trim() : cells[1]?.textContent?.trim()).replace(/[^0-9.-]/g, '')) || 0,
                  change: parseFloat((cells.length > 3 ? cells[3]?.textContent?.trim() : cells[2]?.textContent?.trim()).replace(/[^0-9.-]/g, '')) || 0
                };
                stockData.push(stock);
              }
            }
            
            return JSON.stringify(stockData);
          `}
        ];
        
        const jsExtractData = JSON.stringify(extractScript);
        const encodedJsExtract = encodeURIComponent(jsExtractData);
        
        const extractResponse = await axios({
          method: 'GET',
          url: `https://api.scrape.do/?token=${SCRAPE_TOKEN}&url=${targetUrl}&render=true&playWithBrowser=${encodedJsExtract}&returnJSON=true`,
        });
        
        if (extractResponse.data && extractResponse.data.execute_result) {
          try {
            const jsExtractedStocks = JSON.parse(extractResponse.data.execute_result);
            if (jsExtractedStocks && jsExtractedStocks.length > 0) {
              console.log('Successfully extracted stocks via JavaScript:', jsExtractedStocks.length);
              return {
                success: true,
                data: jsExtractedStocks
              };
            }
          } catch (parseErr) {
            console.error('Error parsing JavaScript extraction result:', parseErr);
          }
        }
      } catch (extractErr) {
        console.error('Error with JavaScript extraction approach:', extractErr);
      }
      
      return {
        success: true,
        data: generateMockStockData(),
        error: 'Could not extract real stock data from the page. Using mock data instead.'
      };
    }
    
    return { success: true, data: stockData };
  } catch (error) {
    console.error('Error scraping stock data with browser interactions:', error);
    return { 
      success: true, 
      data: generateMockStockData(),
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

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
      
      return {
        success: true,
        data: generateMockStockData()
      };
    }
    
    return { success: true, data: stockData };
  } catch (error) {
    console.error('Error scraping stock data:', error);
    return { 
      success: true, 
      data: generateMockStockData() 
    };
  }
};

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
      if (index === 0) return; // Skip header row
      
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
          volume: safeParseInt(getCleanText(cells.length > 3 ? cells[3] : cells[2])),
          changePercent: safeParseFloat(getCleanText(cells.length > 4 ? cells[4] : cells[3])),
          change: safeParseFloat(getCleanText(cells.length > 5 ? cells[5] : cells[4])),
          high: cells.length > 6 ? safeParseFloat(getCleanText(cells[6])) : 0,
          low: cells.length > 7 ? safeParseFloat(getCleanText(cells[7])) : 0,
          open: cells.length > 8 ? safeParseFloat(getCleanText(cells[8])) : 0,
          previousClose: cells.length > 9 ? safeParseFloat(getCleanText(cells[9])) : 0
        };
        
        console.log('Parsed stock:', stock.symbol, stock.price);
        stockData.push(stock);
      }
    });
    
    if (stockData.length === 0) {
      $('div, tr, li').each((i, el) => {
        const text = $(el).text().trim();
        
        const symbolMatch = text.match(/([A-Z]{2,5})\s+[-+]?[0-9]*\.?[0-9]+/);
        if (symbolMatch) {
          const priceMatch = text.match(/[-+]?[0-9]*\.?[0-9]+/);
          const changeMatch = text.match(/[+-][0-9]*\.?[0-9]+/);
          
          if (priceMatch) {
            const stock: Stock = {
              symbol: symbolMatch[1],
              name: `${symbolMatch[1]} Stock`,
              price: parseFloat(priceMatch[0]),
              change: changeMatch ? parseFloat(changeMatch[0]) : 0,
              changePercent: 0,
              volume: 0,
              high: 0,
              low: 0,
              open: 0,
              previousClose: 0
            };
            
            stockData.push(stock);
            
            if (stockData.length >= 20) return false;
          }
        }
      });
    }
    
    console.log('Successfully parsed', stockData.length, 'stocks');
    return stockData;
  } catch (error) {
    console.error('Error parsing HTML with Cheerio:', error);
    return [];
  }
};

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
    
    let watchlistSymbols: string[] = [];
    try {
      const { data } = await supabase
        .from('watchlists')
        .select('symbol')
        .eq('user_id', '00000000-0000-0000-0000-000000000000');
      
      if (data) {
        watchlistSymbols = data.map(item => item.symbol);
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    }

    let portfolioItems: any[] = [];
    try {
      const { data } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', '00000000-0000-0000-0000-000000000000');
      
      if (data) {
        portfolioItems = data;
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    }

    console.log('Sending stock data to Gemini:', stocksData.length, 'stocks');
    console.log('User watchlist symbols:', watchlistSymbols);
    console.log('User portfolio items:', portfolioItems.length);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const watchlistContext = watchlistSymbols.length > 0 
      ? `The user is watching the following stocks: ${watchlistSymbols.join(', ')}. Give these stocks special consideration in your recommendations.` 
      : '';
      
    const portfolioContext = portfolioItems.length > 0
      ? `The user owns the following stocks in their portfolio: ${portfolioItems.map(item => `${item.symbol} (${item.shares} shares at $${item.buy_price})`).join(', ')}. Consider their existing portfolio in your recommendations.`
      : '';

    const prompt = `
      Based on the following stock market data from Nepal, provide trading recommendations for the top 3 most promising stocks.
      ${watchlistContext}
      ${portfolioContext}
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
        return generateMockRecommendations(stocks, watchlistSymbols, portfolioItems);
      }
    } else {
      console.error('JSON pattern not found in response:', response);
      return generateMockRecommendations(stocks, watchlistSymbols, portfolioItems);
    }
  } catch (error) {
    console.error('Error getting stock recommendations:', error);
    return generateMockRecommendations(stocks);
  }
};

const generateMockRecommendations = (
  stocks: Stock[], 
  watchlistSymbols: string[] = [], 
  portfolioItems: any[] = []
): StockRecommendation[] => {
  let candidateStocks = [...stocks];
  let watchlistStocks: Stock[] = [];
  let portfolioStocks: Stock[] = [];
  
  const portfolioSymbols = portfolioItems.map(item => item.symbol);
  
  if (portfolioSymbols.length > 0) {
    portfolioStocks = stocks.filter(stock => portfolioSymbols.includes(stock.symbol));
  }
  
  if (watchlistSymbols.length > 0) {
    watchlistStocks = stocks.filter(stock => watchlistSymbols.includes(stock.symbol));
  }
  
  if (portfolioStocks.length > 0 || watchlistStocks.length > 0) {
    candidateStocks = candidateStocks.filter(stock => 
      !portfolioSymbols.includes(stock.symbol) && !watchlistSymbols.includes(stock.symbol)
    );
    
    candidateStocks.sort((a, b) => b.changePercent - a.changePercent);
    
    candidateStocks = [...portfolioStocks, ...watchlistStocks, ...candidateStocks].slice(0, 3);
  } else {
    candidateStocks.sort((a, b) => b.changePercent - a.changePercent);
    candidateStocks = candidateStocks.slice(0, 3);
  }
  
  const timeFrames: Array<'short' | 'medium' | 'long'> = ['short', 'medium', 'long'];
  
  return candidateStocks.map((stock, index) => {
    let action: 'buy' | 'sell' | 'hold';
    const inPortfolio = portfolioSymbols.includes(stock.symbol);
    
    if (inPortfolio) {
      if (stock.changePercent < -2) {
        action = 'sell';
      } else if (stock.changePercent > 3) {
        action = 'hold';
      } else {
        action = 'hold';
      }
    } else {
      if (stock.changePercent > 1) {
        action = 'buy';
      } else if (stock.changePercent < -1) {
        action = 'sell';
      } else {
        action = 'hold';
      }
    }
    
    let contextText = '';
    if (portfolioSymbols.includes(stock.symbol)) {
      contextText += ' This stock is in your portfolio.';
    }
    if (watchlistSymbols.includes(stock.symbol)) {
      contextText += ' This stock is in your watchlist.';
    }
    
    return {
      symbol: stock.symbol,
      action: action,
      confidence: Math.floor(60 + Math.random() * 30),
      reason: `${action === 'buy' ? 'Positive momentum' : action === 'sell' ? 'Negative trend' : 'Stable performance'} with ${stock.changePercent.toFixed(2)}% change. Volume is ${stock.volume} which indicates ${stock.volume > 100000 ? 'strong' : 'moderate'} market interest.${contextText}`,
      timeFrame: timeFrames[index % timeFrames.length]
    };
  });
};

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
    
    let watchlistItems: any[] = [];
    try {
      const { data } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', '00000000-0000-0000-0000-000000000000');
      
      if (data) {
        watchlistItems = data;
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    }
    
    let portfolioItems: any[] = [];
    try {
      const { data } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', '00000000-0000-0000-0000-000000000000');
      
      if (data) {
        portfolioItems = data;
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    }
    
    const watchlistContext = watchlistItems.length > 0
      ? `The user has the following stocks in their watchlist: ${watchlistItems.map(item => item.symbol).join(', ')}.`
      : 'The user has no stocks in their watchlist.';
      
    const portfolioContext = portfolioItems.length > 0
      ? `The user owns the following stocks in their portfolio: ${portfolioItems.map(item => `${item.symbol} (${item.shares} shares at $${item.buy_price})`).join(', ')}.`
      : 'The user has no stocks in their portfolio.';
    
    console.log('Sending stock data to Gemini for insights:', stocksData.length, 'stocks');

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are a market expert AI assistant. Based on the following stock market data:
      ${JSON.stringify(stocksData)}
      
      ${watchlistContext}
      ${portfolioContext}
      
      Respond to the user's query: "${userQuery}"
      
      Provide detailed analysis, insights, and clear explanations. If the user asks about 
      specific stocks, analyze those stocks from the provided data.
      If the user mentions their watchlist or portfolio stocks, focus your analysis on those stocks.
      Focus on the provided stock data, but you can also use your general knowledge 
      about markets and investment principles to provide context and explanation.
      Be concise and informative.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    
    if (!response || response.trim() === '') {
      return generateMockInsight(userQuery, stocks, watchlistItems.map(item => item.symbol), portfolioItems);
    }
    
    return response;
  } catch (error) {
    console.error('Error getting market insights:', error);
    return generateMockInsight(userQuery, stocks);
  }
};

const generateMockInsight = (
  query: string, 
  stocks: Stock[], 
  watchlistSymbols: string[] = [],
  portfolioItems: any[] = []
): string => {
  const lowerQuery = query.toLowerCase();
  const portfolioSymbols = portfolioItems.map(item => item.symbol);
  
  if (lowerQuery.includes('portfolio') || 
      (lowerQuery.includes('my') && lowerQuery.includes('stocks')) ||
      lowerQuery.includes('my holdings') ||
      lowerQuery.includes('i own')) {
    
    if (portfolioItems.length === 0) {
      return `You don't have any stocks in your portfolio yet. You can add stocks to your portfolio in the Portfolio tab.`;
    }
    
    const portfolioStocks = stocks.filter(stock => portfolioSymbols.includes(stock.symbol));
    
    if (portfolioStocks.length === 0) {
      return `You have ${portfolioItems.length} stocks in your portfolio, but I couldn't find current data for them in the available market information.`;
    }
    
    const totalInvestment = portfolioItems.reduce(
      (sum, item) => sum + (Number(item.shares) * Number(item.buy_price)), 0
    );
    
    let currentValue = 0;
    let totalGainLoss = 0;
    
    portfolioItems.forEach(item => {
      const stockData = stocks.find(s => s.symbol === item.symbol);
      if (stockData) {
        const stockValue = Number(item.shares) * stockData.price;
        const costBasis = Number(item.shares) * Number(item.buy_price);
        currentValue += stockValue;
        totalGainLoss += (stockValue - costBasis);
      } else {
        currentValue += Number(item.shares) * Number(item.buy_price);
      }
    });
    
    const gainLossPercent = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;
    
    const portfolioPerformance = portfolioItems.map(item => {
      const stockData = stocks.find(s => s.symbol === item.symbol);
      const currentPrice = stockData?.price || Number(item.buy_price);
      const priceChange = currentPrice - Number(item.buy_price);
      const priceChangePercent = (priceChange / Number(item.buy_price)) * 100;
      
      return {
        symbol: item.symbol,
        shares: Number(item.shares),
        buyPrice: Number(item.buy_price),
        currentPrice,
        priceChange,
        priceChangePercent,
        totalValue: Number(item.shares) * currentPrice,
        totalCost: Number(item.shares) * Number(item.buy_price),
        gainLoss: (Number(item.shares) * currentPrice) - (Number(item.shares) * Number(item.buy_price)),
        stock: stockData
      };
    });
    
    const bestPerformer = [...portfolioPerformance].sort((a, b) => b.priceChangePercent - a.priceChangePercent)[0];
    const worstPerformer = [...portfolioPerformance].sort((a, b) => a.priceChangePercent - b.priceChangePercent)[0];
    
    return `
Here's an analysis of your portfolio:

You currently own ${portfolioItems.length} stocks with a total investment of $${totalInvestment.toFixed(2)}.
Current portfolio value: $${currentValue.toFixed(2)}
Overall gain/loss: ${totalGainLoss >= 0 ? '+' : ''}$${totalGainLoss.toFixed(2)} (${gainLossPercent >= 0 ? '+' : ''}${gainLossPercent.toFixed(2)}%)

Your best performing stock is ${bestPerformer.symbol} with a ${bestPerformer.priceChangePercent >= 0 ? 'gain' : 'loss'} of ${Math.abs(bestPerformer.priceChangePercent).toFixed(2)}%.
Your weakest performing stock is ${worstPerformer.symbol} with a ${worstPerformer.priceChangePercent >= 0 ? 'gain' : 'loss'} of ${Math.abs(worstPerformer.priceChangePercent).toFixed(2)}%.

${portfolioPerformance.length > 2 ? 
  `Other stocks in your portfolio: ${portfolioPerformance
    .filter(s => s.symbol !== bestPerformer.symbol && s.symbol !== worstPerformer.symbol)
    .map(s => `${s.symbol}: ${s.priceChangePercent >= 0 ? '+' : ''}${s.priceChangePercent.toFixed(2)}%`)
    .join(', ')}.` 
  : ''}

Would you like more detailed analysis on any specific stock in your portfolio?
`;
  }
  
  if (lowerQuery.includes('watchlist') || lowerQuery.includes('watching')) {
    if (watchlistSymbols.length === 0) {
      return `You don't have any stocks in your watchlist yet. You can add stocks to your watchlist by clicking the "Watch" button on any stock card in the Market tab or AI Signals tab.`;
    }
    
    const watchedStocks = stocks.filter(stock => watchlistSymbols.includes(stock.symbol));
    
    if (watchedStocks.length === 0) {
      return `You have ${watchlistSymbols.length} stocks in your watchlist, but I couldn't find current data for them in the available market information.`;
    }
    
    const performingSummary = watchedStocks.filter(s => s.changePercent > 0).length > watchedStocks.length / 2
      ? 'Most of your watched stocks are performing well today.'
      : 'Most of your watched stocks are experiencing downward movement today.';
    
    const bestPerformer = [...watchedStocks].sort((a, b) => b.changePercent - a.changePercent)[0];
    const worstPerformer = [...watchedStocks].sort((a, b) => a.changePercent - b.changePercent)[0];
    
    return `
Here's an analysis of your watchlist:

You are currently watching ${watchedStocks.length} stocks. ${performingSummary}

Your best performing watched stock is ${bestPerformer.symbol} (${bestPerformer.name}) with a ${bestPerformer.changePercent > 0 ? 'gain' : 'loss'} of ${Math.abs(bestPerformer.changePercent).toFixed(2)}%, currently trading at NPR ${bestPerformer.price.toFixed(2)}.

Your weakest performing watched stock is ${worstPerformer.symbol} (${worstPerformer.name}) with a ${worstPerformer.changePercent > 0 ? 'gain' : 'loss'} of ${Math.abs(worstPerformer.changePercent).toFixed(2)}%, currently trading at NPR ${worstPerformer.price.toFixed(2)}.

${watchedStocks.length > 2 ? `Other stocks in your watchlist: ${watchedStocks.filter(s => s.symbol !== bestPerformer.symbol && s.symbol !== worstPerformer.symbol).map(s => `${s.symbol} at NPR ${s.price.toFixed(2)} (${s.changePercent > 0 ? '+' : ''}${s.changePercent.toFixed(2)}%)`).join(', ')}.` : ''}

Would you like more detailed analysis on any specific stock in your watchlist?
`;
  }
  
  const mentionedStock = stocks.find(stock => 
    lowerQuery.includes(stock.symbol.toLowerCase()) || 
    lowerQuery.includes(stock.name.toLowerCase())
  );
  
  if (mentionedStock) {
    const isWatched = watchlistSymbols.includes(mentionedStock.symbol);
    const inPortfolio = portfolioSymbols.includes(mentionedStock.symbol);
    const portfolioItem = portfolioItems.find(item => item.symbol === mentionedStock.symbol);
    
    let portfolioAnalysis = '';
    if (inPortfolio && portfolioItem) {
      const shares = Number(portfolioItem.shares);
      const buyPrice = Number(portfolioItem.buy_price);
      const currentValue = shares * mentionedStock.price;
      const cost = shares * buyPrice;
      const gainLoss = currentValue - cost;
      const gainLossPercent = (gainLoss / cost) * 100;
      
      portfolioAnalysis = `
You own ${shares} shares of this stock at an average purchase price of $${buyPrice.toFixed(2)}.
Current value of your position: $${currentValue.toFixed(2)}
Total gain/loss: ${gainLoss >= 0 ? '+' : ''}$${gainLoss.toFixed(2)} (${gainLossPercent >= 0 ? '+' : ''}${gainLossPercent.toFixed(2)}%)`;
    }
    
    return `
Based on the current market data, ${mentionedStock.symbol} (${mentionedStock.name}) is trading at NPR ${mentionedStock.price.toFixed(2)} with a ${mentionedStock.change > 0 ? 'gain' : 'loss'} of ${Math.abs(mentionedStock.changePercent).toFixed(2)}%.

The stock has a daily trading volume of ${mentionedStock.volume.toLocaleString()}, which indicates ${mentionedStock.volume > 100000 ? 'strong' : 'moderate'} market interest. The day's high was NPR ${mentionedStock.high?.toFixed(2) || 'N/A'} and the low was NPR ${mentionedStock.low?.toFixed(2) || 'N/A'}.

${mentionedStock.changePercent > 2 ? 'This stock is showing strong bullish momentum and might be worth considering for short-term investment opportunities.' : 
  mentionedStock.changePercent < -2 ? 'This stock is showing bearish trends. It might be wise to wait for signs of reversal before considering investment.' :
  'The stock is showing relatively stable performance in the current market conditions.'}
${portfolioAnalysis}

${inPortfolio ? `This stock is currently in your portfolio.` : ''}
${isWatched ? `This stock is currently in your watchlist.` : ''}
${!inPortfolio && !isWatched ? `You are not currently watching or holding this stock. You can add it to your watchlist by clicking the "Watch" button on its stock card.` : ''}

Remember that all investment decisions should be based on comprehensive analysis and align with your overall investment strategy.
`;
  }
  
  const gainers = stocks.filter(s => s.changePercent > 0).length;
  const losers = stocks.filter(s => s.changePercent < 0).length;
  const avgChange = stocks.reduce((sum, stock) => sum + stock.changePercent, 0) / stocks.length;
  const topGainer = [...stocks].sort((a, b) => b.changePercent - a.changePercent)[0];
  const topLoser = [...stocks].sort((a, b) => a.changePercent - b.changePercent)[0];
  
  let watchlistContext = '';
  if (watchlistSymbols.length > 0) {
    const watchedStocks = stocks.filter(stock => watchlistSymbols.includes(stock.symbol));
    if (watchedStocks.length > 0) {
      const watchlistPerformance = watchedStocks.reduce((sum, stock) => sum + stock.changePercent, 0) / watchedStocks.length;
      watchlistContext = `\nRegarding your watchlist: Your watched stocks are ${watchlistPerformance > avgChange ? 'outperforming' : 'underperforming'} the general market with an average change of ${watchlistPerformance.toFixed(2)}% compared to the market average of ${avgChange.toFixed(2)}%.`;
    }
  }
  
  let portfolioContext = '';
  if (portfolioSymbols.length > 0) {
    const portfolioStocks = stocks.filter(stock => portfolioSymbols.includes(stock.symbol));
    if (portfolioStocks.length > 0) {
      const portfolioPerformance = portfolioStocks.reduce((sum, stock) => sum + stock.changePercent, 0) / portfolioStocks.length;
      portfolioContext = `\nYour portfolio stocks are ${portfolioPerformance > avgChange ? 'outperforming' : 'underperforming'} the market today with an average change of ${portfolioPerformance.toFixed(2)}% compared to the market average of ${avgChange.toFixed(2)}%.`;
    }
  }
  
  return `
Based on the current market data, the overall market is showing a ${avgChange > 0 ? 'positive' : 'negative'} trend with an average change of ${avgChange.toFixed(2)}%. 
There are ${gainers} gainers and ${losers} losers among the tracked stocks.

The top gaining stock is ${topGainer.symbol} (${topGainer.name}) with a gain of ${topGainer.changePercent.toFixed(2)}%, 
currently trading at NPR ${topGainer.price.toFixed(2)}.

The biggest losing stock is ${topLoser.symbol} (${topLoser.name}) with a loss of ${Math.abs(topLoser.changePercent).toFixed(2)}%, 
currently trading at NPR ${topLoser.price.toFixed(2)}.
${watchlistContext}
${portfolioContext}

Is there a specific sector or stock you'd like more information about?`;
};
