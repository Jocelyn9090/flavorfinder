import { GoogleGenAI } from "@google/genai";
import type { GeoLocation, GroundingChunk } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function findRestaurants(
    cuisine: string,
    location: GeoLocation
): Promise<{ text: string; groundingChunks: GroundingChunk[] | undefined }> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Find 3 good ${cuisine} restaurants near me. For each restaurant, provide the following details on separate lines: name (in bold), rating (out of 5), price range (e.g., $, $$, $$$), and a short, vibrant, one-paragraph description. Separate each restaurant entry with a double newline. Example format:
**Restaurant Name**
Rating: 4.5
Price: $$
A brief description of the restaurant.`,
            config: {
                tools: [{ googleMaps: {} }],
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

        return {
            text: response.text,
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
