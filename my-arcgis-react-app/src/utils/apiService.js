// Weather API endpoint (using Open-Meteo)
import { GoogleGenerativeAI } from '@google/generative-ai';

// Get environment variables, supporting both Vite and Node.js
const getEnvVar = (key) => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return import.meta.env[key];
};

const WEATHER_API_KEY = getEnvVar('VITE_WEATHER_API_KEY');
const GEMINI_API_KEY = getEnvVar('VITE_GEMINI_API_KEY');
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Calculate distance between two points in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export async function getWeatherData(lat, lon) {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,soil_moisture_1_to_3cm&past_days=1`
        );
        return await response.json();
    } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
    }
}

export async function getFireData(lat, lon) {
    try {
        // For now, return mock data since we don't have a real fire API endpoint
        return {
            risk_level: "moderate",
            conditions: {
                drought_index: 0.6,
                vegetation_dryness: "medium",
                recent_fires: 0
            },
            nearest_fire: {
                distance: 45.2,  // kilometers
                name: "Sample Fire",
                containment: "65%",
                size: 1200  // acres
            }
        };
    } catch (error) {
        console.error('Error fetching fire data:', error);
        return { risk: 'Unable to fetch fire risk data' };
    }
}

export async function getGeminiAnalysis(weatherData, fireData, cityName) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
            Analyze this fire and weather data for ${cityName} and create a very concise, easy-to-read summary.
            Focus on the most important information for residents.
            
            Data:
            - Temperature: ${weatherData.hourly.temperature_2m[0]}°C
            - Humidity: ${weatherData.hourly.relative_humidity_2m[0]}%
            - Wind Speed: ${weatherData.hourly.wind_speed_10m[0]} km/h
            - Fire Risk: ${fireData.risk_level}
            - Nearest Fire: ${fireData.nearest_fire.distance}km away
            - Nearest Fire Details: ${fireData.nearest_fire.name} (${fireData.nearest_fire.containment} contained)
            
            Format the response like this:
            🔥 FIRE RISK: [risk level]
            
            📍 NEAREST FIRE:
            - Distance: [X] km away
            - Name: [fire name]
            - Containment: [X]%
            
            🌡️ CURRENT CONDITIONS:
            - [3-4 key weather points that affect fire risk]
            
            ⚠️ ACTIONS TO TAKE:
            - [2-3 specific actions based on the conditions]
            
            Keep it brief but informative. Use emojis for visual scanning.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error getting AI analysis:', error);
        return 'Unable to generate AI analysis at this time.';
    }
}
