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

// Example fire risk API (using USFS NFDRS as an example)
export async function getFireData(lat, lon) {
    try {
        // For now, return mock data since we don't have a real fire API endpoint
        return {
            risk_level: "moderate",
            conditions: {
                drought_index: 0.6,
                vegetation_dryness: "medium",
                recent_fires: 0
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
            Analyze the following weather and fire risk data for ${cityName}:
            
            Weather Data:
            - Temperature: ${weatherData.hourly.temperature_2m[0]}°C
            - Humidity: ${weatherData.hourly.relative_humidity_2m[0]}%
            - Wind Speed: ${weatherData.hourly.wind_speed_10m[0]} km/h
            - Precipitation Probability: ${weatherData.hourly.precipitation_probability[0]}%
            - Soil Moisture: ${weatherData.hourly.soil_moisture_1_to_3cm[0]}
            
            Fire Risk Data:
            - Risk Level: ${fireData.risk_level}
            - Drought Index: ${fireData.conditions.drought_index}
            - Vegetation Dryness: ${fireData.conditions.vegetation_dryness}
            
            Provide a concise analysis including:
            1. Current fire risk assessment based on weather conditions
            2. Key weather factors that could affect fire risk in the next 24 hours
            3. Specific actionable steps residents should take
            4. Emergency preparedness recommendations
            
            Format the response in a clear, bullet-point manner.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error getting AI analysis:', error);
        return 'Unable to generate AI analysis at this time.';
    }
}
