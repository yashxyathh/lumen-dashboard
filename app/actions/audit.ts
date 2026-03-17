"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY as string);

export async function auditFix(beforeUrl: string, afterUrl: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Helper to convert URL to the format Gemini needs
    async function urlToGenerativePart(url: string) {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      return {
        inlineData: {
          data: Buffer.from(buffer).toString("base64"),
          mimeType: "image/jpeg",
        },
      };
    }

    const prompt = `
      You are an urban maintenance auditor. 
      Image 1 is the 'Before' photo of a reported problem. 
      Image 2 is the 'After' photo showing the completed work.
      Analyze if the specific problem shown in Image 1 has been fixed in Image 2.
      Return ONLY a JSON object like this: 
      {"resolved": true, "confidence": 95, "reason": "The ticket is completely solved."}
    `;

    const imageParts = await Promise.all([
      urlToGenerativePart(beforeUrl),
      urlToGenerativePart(afterUrl),
    ]);

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    
    // Clean the AI text (sometimes it adds ```json markers)
    const jsonString = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("AI Audit Failed:", error);
    return { error: "Failed to audit image" };
  }
}
