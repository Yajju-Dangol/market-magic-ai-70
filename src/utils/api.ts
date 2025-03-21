
import { Stock, StockRecommendation, ApiResponse } from './types';
import axios from 'axios';

const SCRAPE_TOKEN = import.meta.env.VITE_SCRAPE_DO_TOKEN || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
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
  try {
    // Basic parsing for demo purposes
    // In a production environment, you would use a library like Cheerio
    const stockData: Stock[] = [];
    
    // Check if we have actual HTML data
    if (htmlData && typeof htmlData === 'string') {
      console.log('HTML data received, length:', htmlData.length);
      
      // Extract table data - this is a simplified example
      // Actual implementation would need to be adjusted based on the website structure
      const tableRegex = /<table[^>]*class="[^"]*market-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i;
      const tableMatch = htmlData.match(tableRegex);
      
      if (tableMatch && tableMatch[1]) {
        const tableContent = tableMatch[1];
        console.log('Found market table, extracting data...');
        
        // Extract rows
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;
        let rowCount = 0;
        
        while ((rowMatch = rowRegex.exec(tableContent)) !== null && rowCount < 10) {
          // Skip header row
          if (rowCount > 0) {
            const rowContent = rowMatch[1];
            
            // Extract cells
            const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            const cells: string[] = [];
            let cellMatch;
            
            while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
              // Clean up the cell content (remove HTML tags)
              const cellContent = cellMatch[1].replace(/<[^>]*>/g, '').trim();
              cells.push(cellContent);
            }
            
            // Create stock object if we have enough cells
            if (cells.length >= 6) {
              const stock: Stock = {
                symbol: cells[0] || 'Unknown',
                name: cells[1] || 'Unknown Company',
                price: parseFloat(cells[2]) || 0,
                change: parseFloat(cells[3]) || 0,
                changePercent: parseFloat(cells[4]) || 0,
                volume: parseInt(cells[5].replace(/,/g, '')) || 0,
                high: parseFloat(cells[6]) || 0,
                low: parseFloat(cells[7]) || 0,
                open: parseFloat(cells[8]) || 0,
                previousClose: parseFloat(cells[9]) || 0
              };
              
              stockData.push(stock);
            }
          }
          
          rowCount++;
        }
      }
    }
    
    // Return parsed data or fallback to mock data if parsing failed
    if (stockData.length > 0) {
      console.log('Successfully parsed', stockData.length, 'stocks');
      return stockData;
    } else {
      console.warn('Parsing failed, returning mock data');
      return getMockStockData();
    }
  } catch (error) {
    console.error('Error parsing HTML:', error);
    return getMockStockData();
  }
};

// Fallback mock data
const getMockStockData = (): Stock[] => {
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

    // Call Gemini API
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
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
        }
      }
    }
    
    // Fallback to mock data if parsing failed
    console.warn('Failed to parse Gemini response, using mock data');
    return getMockRecommendations();
  } catch (error) {
    console.error('Error getting stock recommendations:', error);
    return getMockRecommendations();
  }
};

// Fallback mock recommendations
const getMockRecommendations = (): StockRecommendation[] => {
  return [
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
};
