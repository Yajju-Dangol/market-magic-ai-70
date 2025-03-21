import { Stock, StockRecommendation, ApiResponse, MarketSummary } from './types';
import axios from 'axios';
import * as cheerio from 'cheerio';

const SCRAPE_TOKEN = import.meta.env.VITE_SCRAPE_DO_TOKEN || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const TARGET_URL = 'https://www.nepsetrading.com/market/stocks';

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
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
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

    // Parse the HTML data using Cheerio
    const stockData = parseStockData(response.data);
    
    if (stockData.length === 0) {
      // If we couldn't parse the expected table, try to understand why
      const $ = cheerio.load(response.data);
      console.log('Page title:', $('title').text());
      console.log('Tables found:', $('table').length);
      console.log('First table classes:', $('table').first().attr('class'));
      
      // Check for rate limiting or CloudFlare protection messages
      const bodyText = $('body').text().substring(0, 200);
      console.log('Body text excerpt:', bodyText);
      
      return {
        success: false,
        error: 'Failed to parse stock data from the response. The site structure may have changed or access may be restricted.'
      };
    }
    
    return { success: true, data: stockData };
  } catch (error) {
    console.error('Error scraping stock data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
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
    
    // Output all tables and their classes for debugging
    console.log('All tables on the page:');
    $('table').each((i, table) => {
      console.log(`Table ${i}:`, $(table).attr('class'));
    });
    
    // Try different selectors that might match the stock table
    const possibleSelectors = [
      '.market-table',
      'table.market-table',
      'table.stock-table',
      'table.data-table',
      '.stock-data table',
      '#market-data table',
      'table',  // Fallback to any table
    ];
    
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
    
    // Process rows (skip header)
    marketTable.find('tr').each((index, row) => {
      // Skip header row
      if (index === 0) return;
      
      const cells = $(row).find('td');
      console.log(`Row ${index} has ${cells.length} cells`);
      
      if (cells.length >= 4) { // Minimum required data
        // Get text and clean it
        const getCleanText = (cell: any) => $(cell).text().trim().replace(/\s+/g, ' ');
        
        // Try to parse values safely
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
        
        // Construct stock object with defensive parsing
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
        
        // Limit to 10 stocks for performance reasons
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

    // Format stock data for the Gemini API
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

    // Prepare the prompt for Gemini
    const prompt = `
      Based on the following stock market data from Nepal, provide trading recommendations for the top 3 most promising stocks.
      For each recommendation, specify whether to buy, sell, or hold, with a confidence level (0-100), 
      a brief reason for the recommendation, and a timeframe (short, medium, or long).
      Return the response in a JSON format with an array of objects containing symbol, action, confidence, reason, and timeFrame.
      
      Stock data: ${JSON.stringify(stocksData)}
    `;

    // Call Gemini API using the correct API endpoint for the v1 API
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Gemini API response status:', response.status);

    if (response.status !== 200) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    // Parse Gemini response
    const geminiResponse = response.data;
    console.log('Gemini API response structure:', Object.keys(geminiResponse));
    
    if (
      geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text
    ) {
      const textResponse = geminiResponse.candidates[0].content.parts[0].text;
      console.log('Gemini text response (first 100 chars):', textResponse.substring(0, 100));
      
      // Extract JSON from the text response
      const jsonMatch = textResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        try {
          const recommendations = JSON.parse(jsonStr) as StockRecommendation[];
          console.log('Parsed recommendations:', recommendations);
          return recommendations;
        } catch (e) {
          console.error('Error parsing JSON from Gemini response:', e);
          throw new Error('Failed to parse JSON from Gemini response');
        }
      } else {
        console.error('JSON pattern not found in response:', textResponse);
        throw new Error('No JSON array found in Gemini response');
      }
    } else {
      console.error('Invalid Gemini response structure:', geminiResponse);
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    console.error('Error getting stock recommendations:', error);
    throw error;
  }
};

// Function to get market insights using Gemini AI
export const getMarketInsights = async (stocks: Stock[], userQuery: string): Promise<string> => {
  try {
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
    
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is missing');
    }
    
    if (!stocks || stocks.length === 0) {
      throw new Error('No stock data available for analysis');
    }

    // Format stock data for the Gemini API
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

    // Prepare the prompt for Gemini
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

    // Call Gemini API
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status !== 200) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    // Parse Gemini response
    const geminiResponse = response.data;
    
    if (
      geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text
    ) {
      const textResponse = geminiResponse.candidates[0].content.parts[0].text;
      return textResponse;
    } else {
      console.error('Invalid Gemini response structure:', geminiResponse);
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    console.error('Error getting market insights:', error);
    throw error;
  }
};
