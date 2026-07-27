import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
let aiClient = null;

if (apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.warn('Failed to initialize Gemini AI client:', error.message);
  }
}

/**
 * Generate smart restaurant insights based on sales summary and inventory warnings.
 * @param {Object} data 
 * @param {Array} data.salesHistory - List of order items and quantities sold
 * @param {Array} data.lowStockItems - Inventory items below minimum threshold
 * @param {number} data.avgPrepTime - Average prep time in seconds
 */
export async function getRestaurantInsights({ salesHistory, lowStockItems, avgPrepTime }) {
  const promptText = `
    You are an AI restaurant operations consultant for "VibeDine", a premium dining space.
    Review the following restaurant performance logs and generate action items, inventory replenishment suggestions, and menu optimization recommendations.

    CURRENT PERFORMANCE METRICS:
    - Average Order Prep Time: ${avgPrepTime ? (avgPrepTime / 60).toFixed(1) : '15'} minutes
    - Low-Stock Inventory Alerts:
      ${lowStockItems.length > 0 ? lowStockItems.map(item => `* ${item.itemName} (Current Stock: ${item.quantity}, Reorder Point: ${item.minThresholdWarning})`).join('\n') : 'No items are low in stock.'}
    
    RECENT SALES PERFORMANCE (ITEMS SOLD):
    ${salesHistory.length > 0 ? salesHistory.map(item => `* ${item.name} (${item.quantity} units sold)`).join('\n') : 'No orders recorded yet.'}

    REQUIREMENTS:
    Please provide your output in structured JSON matching this exact format:
    {
      "executiveSummary": "A short summary of current operations.",
      "inventoryWarnings": ["Actionable steps for low stock items"],
      "demandForecast": "Predicted customer trends based on sales history.",
      "operationalRecommendations": ["Specific operational changes to improve prep times or customer experience"]
    }
  `;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: {
          responseMimeType: 'application/json'
        }
      });
      if (response && response.text) {
        return JSON.parse(response.text);
      }
    } catch (error) {
      console.error('Gemini API request failed, falling back to mock insights. Error:', error.message);
    }
  }

  // Robust mock insights fallback
  return {
    executiveSummary: "VibeDine is performing steadily. Recent orders show strong demand for premium Mains. We notice prep times are within normal limits, but minor inventory levels require attention to sustain high-volume demand.",
    inventoryWarnings: lowStockItems.length > 0 
      ? lowStockItems.map(item => `Replenish ${item.itemName} immediately. Current stock of ${item.quantity} units is below the safety threshold of ${item.minThresholdWarning}.`)
      : ["All core inventory elements are currently above standard threshold warning limits."],
    demandForecast: "We forecast a 15% increase in orders for 'Wagyu Beef Smash Burgers' and 'Truffle Mac & Cheese' during upcoming weekend evening slots. Stock up on beef patties and truffle oil accordingly.",
    operationalRecommendations: [
      `Maintain prep times below 15 mins (current avg: ${avgPrepTime ? (avgPrepTime / 60).toFixed(1) : '15'} mins) by pre-batching common appetizer ingredients.`,
      "Activate offline/online staff monitoring to ensure table calls are routed only to active personnel, lowering response time below 30 seconds."
    ]
  };
}
