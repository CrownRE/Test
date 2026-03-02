import { GoogleGenAI } from "@google/genai";

// As per guidelines, the API key must be sourced from process.env.API_KEY
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  // This case should not happen in the target environment where the key is pre-configured.
  // It's included as a safeguard during development.
  console.error("API_KEY environment variable not set. Please ensure it is configured.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export async function generateGeminiExplanation(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        // System instruction to guide the model's tone and style.
        systemInstruction: "You are an expert genealogist. Your role is to explain family relationships based on lineage paths provided. Be concise, clear, and friendly. Respond only with the explanation sentence, without any preamble.",
        temperature: 0.3, // Lower temperature for more factual, less creative responses.
      },
    });
    
    // Using the .text property for direct access to the string output, as per guidelines.
    return response.text || "No explanation generated.";
  } catch (error) {
    console.error("Error generating explanation from Gemini:", error);
    // Return a user-friendly error message. This will be displayed in the UI.
    return "There was an issue generating the explanation. Please try again later.";
  }
}
