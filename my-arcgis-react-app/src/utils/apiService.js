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
        const model = new GoogleGenerativeAI(getEnvVar('VITE_GEMINI_API_KEY')).getGenerativeModel({ model: 'gemini-pro' });

        const currentHourIndex = new Date().getHours();
        const currentConditions = {
            temperature: weatherData.hourly.temperature_2m[currentHourIndex],
            humidity: weatherData.hourly.relative_humidity_2m[currentHourIndex],
            windSpeed: weatherData.hourly.wind_speed_10m[currentHourIndex],
            windDirection: weatherData.hourly.wind_direction_10m[currentHourIndex],
            windGusts: weatherData.hourly.wind_gusts_10m[currentHourIndex],
            precipitation: weatherData.hourly.precipitation[currentHourIndex],
            precipitationProb: weatherData.hourly.precipitation_probability[currentHourIndex],
            soilMoisture: weatherData.hourly.soil_moisture_1_to_3cm[currentHourIndex]
        };

        const prompt = `Based on the following weather conditions for ${cityName}, provide a fire risk assessment. Format your response exactly as shown below, replacing the placeholders with your analysis. Do not use asterisks or markdown formatting:

Current Weather Data:
Temperature: ${currentConditions.temperature}°C
Humidity: ${currentConditions.humidity}%
Wind Speed: ${currentConditions.windSpeed} km/h
Wind Direction: ${currentConditions.windDirection}°
Wind Gusts: ${currentConditions.windGusts} km/h
Precipitation: ${currentConditions.precipitation} mm
Precipitation Probability: ${currentConditions.precipitationProb}%
Soil Moisture: ${currentConditions.soilMoisture} m³/m³

Please format your response exactly like this (replace text in brackets with your analysis):

Fire Risk Assessment for ${cityName}

Risk Level: [Single word: Low/Moderate/High/Extreme]
Risk Percentage: [X]%

Key Risk Factors:
• [First major risk factor]
• [Second major risk factor]
• [Third major risk factor if applicable]

Current Concerns:
• [First specific concern]
• [Second specific concern]
• [Third specific concern if applicable]

Safety Recommendations:
• [First recommendation]
• [Second recommendation]
• [Third recommendation if applicable]

Keep the response concise and clear. Use bullet points with • instead of - or *. Do not add any additional formatting or sections.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error getting Gemini analysis:', error);
        return 'Unable to analyze weather conditions at this time.';
    }
}
