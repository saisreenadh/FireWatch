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
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,soil_moisture_1_to_3cm&past_days=31`
        );
        return await response.json();
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return null;
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

        // Get current conditions
        const currentHourIndex = new Date().getHours();

        // Calculate historical trends (last 31 days)
        const historicalData = {
            avgTemp: calculateAverage(weatherData.hourly.temperature_2m),
            avgHumidity: calculateAverage(weatherData.hourly.relative_humidity_2m),
            avgWindSpeed: calculateAverage(weatherData.hourly.wind_speed_10m),
            avgSoilMoisture: calculateAverage(weatherData.hourly.soil_moisture_1_to_3cm),
            dryDays: countDryDays(weatherData.hourly.precipitation),
            highWindDays: countHighWindDays(weatherData.hourly.wind_speed_10m),
            lowHumidityDays: countLowHumidityDays(weatherData.hourly.relative_humidity_2m)
        };

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

        const prompt = `As a fire safety expert, analyze this comprehensive weather and fire data for ${cityName} and provide a practical fire risk assessment:

CURRENT CONDITIONS:
Temperature: ${currentConditions.temperature}°C
Humidity: ${currentConditions.humidity}%
Wind Speed: ${currentConditions.windSpeed} km/h
Wind Direction: ${currentConditions.windDirection}°
Wind Gusts: ${currentConditions.windGusts} km/h
Current Precipitation: ${currentConditions.precipitation} mm
Precipitation Probability: ${currentConditions.precipitationProb}%
Soil Moisture: ${currentConditions.soilMoisture} m³/m³

WEATHER PATTERNS (Last 31 Days):
Average Temperature: ${historicalData.avgTemp.toFixed(1)}°C
Average Humidity: ${historicalData.avgHumidity.toFixed(1)}%
Average Wind Speed: ${historicalData.avgWindSpeed.toFixed(1)} km/h
Days without significant rain: ${historicalData.dryDays}
Days with strong winds: ${historicalData.highWindDays}
Days with very dry conditions: ${historicalData.lowHumidityDays}

FIRE ACTIVITY (50km radius):
Active Fires: ${fireData.active_fires_count || 0}
Fire Perimeters: ${fireData.perimeters_count || 0}
Total Area Burning: ${fireData.total_burned_acres ? fireData.total_burned_acres.toFixed(1) : 0} acres
${fireData.nearest_fire ? `
Closest Fire:
- Name: ${fireData.nearest_fire.name}
- Distance: ${fireData.nearest_fire.distance} km
- Size: ${fireData.nearest_fire.size} acres
- Containment: ${fireData.nearest_fire.containment}` : ''}

Provide a practical fire risk assessment considering:
1. Actual fire presence and behavior in the area
2. Current weather that could affect fire spread (wind, humidity, temperature)
3. Recent weather patterns indicating fire-prone conditions
4. Ground conditions (soil moisture, precipitation)

Format the response exactly like this:
{
  "cityName": "${cityName}",
  "fireRiskAssessment": {
    "riskLevel": "[REQUIRED: Low/Medium/High - Consider regional characteristics. Los Angeles and Southern California are HIGH due to climate, vegetation, and fire history]",
    "keyRiskFactors": [
      "[REQUIRED: Most critical current condition]",
      "[REQUIRED: Most significant fire activity]",
      "[OPTIONAL: Additional important factor]"
    ],
    "currentConcerns": [
      "[REQUIRED: Most pressing immediate concern]",
      "[REQUIRED: Secondary current concern]",
      "[OPTIONAL: Additional concern]"
    ],
    "safetyRecommendations": [
      "[REQUIRED: Most important immediate action]",
      "[REQUIRED: Secondary safety measure]",
      "[OPTIONAL: Additional precaution]"
    ]
  }
}

Consider real-world examples:
High Risk: Los Angeles and Southern California due to Santa Ana winds, dry climate, and fire history. Areas with active fires or severe fire weather.
Medium Risk: Areas experiencing drought or moderate fire weather conditions
Low Risk: Areas with consistent rainfall and minimal fire history`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(response.text());
    } catch (error) {
        console.error('Error getting Gemini analysis:', error);
        return 'Unable to analyze fire conditions at this time.';
    }
}

// Helper functions for historical analysis
function calculateAverage(array) {
    return array.reduce((a, b) => a + b, 0) / array.length;
}

function countDryDays(precipitation) {
    return precipitation.filter(mm => mm < 0.1).length / 24; // Convert hours to days
}

function countHighWindDays(windSpeed) {
    return new Set(windSpeed.filter(speed => speed > 20)
        .map((_, i) => Math.floor(i / 24))).size; // Group by day
}

function countLowHumidityDays(humidity) {
    return new Set(humidity.filter(h => h < 30)
        .map((_, i) => Math.floor(i / 24))).size; // Group by day
}
