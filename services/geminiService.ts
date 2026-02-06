import { GoogleGenAI, Type } from "@google/genai";

export interface AISessionData {
  location: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  courtCount: number;
}

// Fix: Implemented session parsing using Gemini 3 Flash with structured JSON output
export const parseSessionFromText = async (text: string): Promise<AISessionData | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract badminton session details from the following text: "${text}".
      Use the current time ${new Date().toISOString()} as a reference for relative dates or times (like "tomorrow" or "at 6pm").
      Return the location, startTime (ISO 8601 string), endTime (ISO 8601 string), and courtCount.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            location: {
              type: Type.STRING,
              description: "The name of the venue or sports club.",
            },
            startTime: {
              type: Type.STRING,
              description: "The ISO 8601 timestamp for when the session starts.",
            },
            endTime: {
              type: Type.STRING,
              description: "The ISO 8601 timestamp for when the session ends.",
            },
            courtCount: {
              type: Type.NUMBER,
              description: "The number of courts booked.",
            },
          },
          required: ["location", "startTime", "endTime", "courtCount"],
        },
      },
    });

    const jsonStr = response.text?.trim();
    if (jsonStr) {
      try {
        return JSON.parse(jsonStr) as AISessionData;
      } catch (e) {
        console.error("Failed to parse Gemini JSON output:", e);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Session Parsing Error:", error);
    return null;
  }
};