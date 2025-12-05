import { GoogleGenAI } from "@google/genai";
import { CHECKLIST_DATA } from '../constants';

const SYSTEM_INSTRUCTION = `
You are a helpful and knowledgeable assistant for a US Relocation/Settlement web application.
Your goal is to help users understand the settlement process in the US (specifically California based on the context).
You have access to a specific checklist of tasks the user needs to complete.

Here is the checklist context:
${JSON.stringify(CHECKLIST_DATA.map(item => ({ title: item.title, description: item.description, category: item.category })))}

Rules:
1. Answer questions based on the provided checklist context first.
2. If the context doesn't cover the detail, use your general knowledge about US immigration/settlement (focusing on California/SoCal nuances as hinted by "SoCal Edison").
3. Be concise, encouraging, and clear.
4. Format your response in plain text or simple Markdown (bolding key terms).
`;

export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return "API Key is missing. Please check your configuration.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Using gemini-2.5-flash for fast, responsive chat
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "An error occurred while communicating with the AI. Please try again later.";
  }
};