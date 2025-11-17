
import { GoogleGenAI } from "@google/genai";
import type { GeoLocation, GroundingChunk, Restaurant } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function findRestaurants(
    cuisine: string,
    location: GeoLocation
): Promise<{ restaurants: Restaurant[]; groundingChunks: GroundingChunk[] | undefined }> {
    try {
        const prompt = `Find 3 good ${cuisine} restaurants near latitude ${location.latitude} and longitude ${location.longitude}. Respond ONLY with a valid JSON array of objects. Each object must have the following keys: "name" (string), "description" (string, one vibrant paragraph), "rating" (number), and "priceRange" (string, e.g., "$", "$$", "$$$"). Do not include any other text, markdown formatting, or explanations.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleMaps: {} }],
                thinkingConfig: { thinkingBudget: 0 },
            },
            toolConfig: {
                retrievalConfig: {
                    latLng: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                    },
                },
            },
        });

        // Clean the response to ensure it's a parseable JSON string.
        let responseText = response.text.trim();
        if (responseText.startsWith("```json")) {
            responseText = responseText.substring(7, responseText.length - 3).trim();
        } else if (responseText.startsWith("```")) {
            responseText = responseText.substring(3, responseText.length - 3).trim();
        }
        
        const restaurants = JSON.parse(responseText);

        return {
            restaurants,
            groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
        };
    } catch (error) {
        console.error("Error calling Gemini API for restaurants:", error);
        throw new Error("Failed to fetch data from Gemini API.");
    }
}

export async function generateInvitation(restaurantName: string, cuisine: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Write a short, friendly, and casual text message to invite a friend to get ${cuisine} at a restaurant called "${restaurantName}". Make it sound exciting and suggest a time like "tonight" or "this weekend". Keep it under 50 words.`,
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for invitation:", error);
        throw new Error("Failed to generate invitation from Gemini API.");
    }
}
