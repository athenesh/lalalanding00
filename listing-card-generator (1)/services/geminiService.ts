import { GoogleGenAI } from "@google/genai";
import { ListingData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseListingData = async (text: string): Promise<ListingData> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a real estate extraction assistant. 
      The user will provide a Real Estate URL, a raw description, or an address.
      
      YOUR TASK:
      1. If it is a URL or address, use Google Search to find the most recent listing details.
      2. Extract the following fields: Unit Name (or short title), Price, Beds, Baths, Sqft, Complex Name, Full Address.
      3. Format the Output as a STRICT JSON object. Do not include markdown formatting like \`\`\`json.

      Input: "${text}"

      Required JSON Structure:
      {
        "unitName": "String (e.g. 'B6', 'Plan A')",
        "price": "String (e.g. '$3,590-$3,605/mo')",
        "beds": "String (e.g. '2')",
        "baths": "String (e.g. '2')",
        "sqft": "String (e.g. '1,211')",
        "complexName": "String",
        "fullAddress": "String"
      }`,
      config: {
        // responseMimeType and responseSchema are NOT allowed when using tools: [{googleSearch: {}}]
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const outputText = response.text || "{}";
    
    // Clean up potential markdown code blocks if the model adds them despite instructions
    const jsonString = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonString) as ListingData;

  } catch (error) {
    console.error("Error parsing listing data:", error);
    throw error;
  }
};