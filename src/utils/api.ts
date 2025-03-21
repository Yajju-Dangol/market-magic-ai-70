
import { Stock, StockRecommendation, ApiResponse } from './types';
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

    // Parse the HTML data using Cheerio
    const stockData = parseStockData(response.data);
    
    if (stockData.length === 0) {
      return {
        success: false,
        error: 'Failed to parse stock data from the response'
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
    
    // Find the market table - adjust selector based on actual page structure
    const marketTable = $('.market-table');
    
    if (marketTable.length === 0) {
      console.error('Market table not found in HTML');
      return [];
    }
    
    // Process rows (skip header)
    marketTable.find('tr').each((index, row) => {
      // Skip header row
      if (index === 0) return;
      
      const cells = $(row).find('td');
      
      if (cells.length >= 6) {
        const stock: Stock = {
          symbol: $(cells[0]).text().trim() || 'Unknown',
          name: $(cells[1]).text().trim() || 'Unknown Company',
          price: parseFloat($(cells[2]).text().trim()) || 0,
          change: parseFloat($(cells[3]).text().trim()) || 0,
          changePercent: parseFloat($(cells[4]).text().trim().replace('%', '')) || 0,
          volume: parseInt($(cells[5]).text().trim().replace(/,/g, '')) || 0,
          high: cells.length > 6 ? (parseFloat($(cells[6]).text().trim()) || 0) : 0,
          low: cells.length > 7 ? (parseFloat($(cells[7]).text().trim()) || 0) : 0,
          open: cells.length > 8 ? (parseFloat($(cells[8]).text().trim()) || 0) : 0,
          previousClose: cells.length > 9 ? (parseFloat($(cells[9]).text().trim()) || 0) : 0
        };
        
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
      }
    );

    if (response.status !== 200) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    // Parse Gemini response
    const geminiResponse = response.data;
    console.log('Gemini API response:', geminiResponse);
    
    if (
      geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text
    ) {
      const textResponse = geminiResponse.candidates[0].content.parts[0].text;
      
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
        throw new Error('No JSON array found in Gemini response');
      }
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    console.error('Error getting stock recommendations:', error);
    throw error;
  }
};
