import { Stock, StockRecommendation, ApiResponse, MarketSummary } from './types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    const stockData = parseStockData(response.data);
    
    if (stockData.length === 0) {
      const $ = cheerio.load(response.data);
      console.log('Page title:', $('title').text());
      console.log('Tables found:', $('table').length);
      console.log('First table classes:', $('table').first().attr('class'));
      
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
        throw new Error('Failed to parse JSON from Gemini response');
      }
    } else {
      console.error('JSON pattern not found in response:', response);
      throw new Error('No JSON array found in Gemini response');
    }
  } catch (error) {
    console.error('Error getting stock recommendations:', error);
    throw error;
  }
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
    return response;
  } catch (error) {
    console.error('Error getting market insights:', error);
    throw error;
  }
};
