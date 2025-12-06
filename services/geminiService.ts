import { GoogleGenAI } from "@google/genai";
import { NewsArticle } from "../types";

export const generateNewsReport = async (articles: NewsArticle[]): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // Graceful fallback if no API key is present
    throw new Error("API Key not configured. Please add your Google GenAI API Key to the environment.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Prepare a concise list for the model (limit to top 20 to avoid context limits on smaller models)
  // UPGRADE: Now includes the description/snippet for better context analysis
  const articleList = articles.slice(0, 20).map(a => {
    const cleanDesc = a.description.replace(/<[^>]*>?/gm, ''); // Strip HTML tags from snippet
    return `
    - TITLE: ${a.title}
      SOURCE: ${a.source}
      SNIPPET: ${cleanDesc.substring(0, 150)}...
    `;
  }).join('\n');

  const prompt = `
    You are a senior intelligence analyst. 
    Analyze the following list of news headlines and snippets to provide a professional executive summary.
    
    ### RAW INTEL DATA:
    ${articleList}
    
    ### INSTRUCTIONS:
    Please provide the output in clean Markdown format with the following sections:
    
    ### 🚨 Executive Summary
    (A 2-3 sentence high-level overview of the news landscape based on the snippets provided)

    ### 🔑 Key Themes
    - **Theme 1**: Detail...
    - **Theme 2**: Detail...

    ### 📉 Sentiment Analysis
    (Brief assessment of the overall mood: Positive/Negative/Neutral and why)

    ### 📌 Critical Updates
    (Identify the top 3 most impactful stories with a brief reason why)
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Failed to generate report.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to contact AI service. Please try again later.");
  }
};