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

        const prompt = `Analyze the following comprehensive weather and fire data to provide a detailed fire risk assessment for ${cityName}:

CURRENT CONDITIONS:
Temperature: ${currentConditions.temperature}°C
Humidity: ${currentConditions.humidity}%
Wind Speed: ${currentConditions.windSpeed} km/h
Wind Direction: ${currentConditions.windDirection}°
Wind Gusts: ${currentConditions.windGusts} km/h
Precipitation: ${currentConditions.precipitation} mm
Precipitation Probability: ${currentConditions.precipitationProb}%
Soil Moisture: ${currentConditions.soilMoisture} m³/m³

31-DAY HISTORICAL TRENDS:
Average Temperature: ${historicalData.avgTemp.toFixed(1)}°C
Average Humidity: ${historicalData.avgHumidity.toFixed(1)}%
Average Wind Speed: ${historicalData.avgWindSpeed.toFixed(1)} km/h
Average Soil Moisture: ${historicalData.avgSoilMoisture.toFixed(3)} m³/m³
Days with No Precipitation: ${historicalData.dryDays}
Days with High Winds (>20 km/h): ${historicalData.highWindDays}
Days with Low Humidity (<30%): ${historicalData.lowHumidityDays}

FIRE ACTIVITY (50km radius):
Total Active Fires: ${fireData.active_fires_count || 0}
Total Fire Perimeters: ${fireData.perimeters_count || 0}
Total Burned Area: ${fireData.total_burned_acres ? fireData.total_burned_acres.toFixed(1) : 0} acres
${fireData.nearest_fire ? `
Nearest Fire:
- Name: ${fireData.nearest_fire.name}
- Distance: ${fireData.nearest_fire.distance} km
- Size: ${fireData.nearest_fire.size} acres
- Containment: ${fireData.nearest_fire.containment}` : ''}

Based on this data, provide a detailed fire risk assessment. Consider:
1. Current fire weather conditions (temperature, humidity, wind)
2. Historical weather patterns showing drought or fire-prone conditions
3. Soil moisture levels indicating vegetation dryness
4. Existing fire activity in the area
5. Wind conditions that could affect fire spread

Format the response exactly like this:
{
  "cityName": "${cityName}",
  "fireRiskAssessment": {
    "riskLevel": "[REQUIRED: Based on riskPercentage - Low (0-33), Medium (34-66), High (67-100)]",
    "riskPercentage": "[REQUIRED: Precise number 0-100, calculate as follows:
      - Current conditions (50%):
        * Temperature: 0-10 points (>30°C: 10pts, >25°C: 7pts, >20°C: 5pts, >15°C: 3pts)
        * Humidity: 0-15 points (<30%: 15pts, <40%: 10pts, <50%: 5pts)
        * Wind Speed: 0-15 points (>30km/h: 15pts, >20km/h: 10pts, >10km/h: 5pts)
        * Soil Moisture: 0-10 points (<0.1: 10pts, <0.2: 7pts, <0.3: 3pts)
      - Fire activity (25%):
        * Nearest fire distance: 0-10 points (<10km: 10pts, <25km: 7pts, <50km: 3pts)
        * Total fires: 0-10 points (>5: 10pts, >3: 7pts, >1: 3pts)
        * Burned area: 0-5 points (>1000acres: 5pts, >500acres: 3pts, >100acres: 1pt)
      - Historical trends (25%):
        * Dry days: 0-10 points (>20days: 10pts, >15days: 7pts, >10days: 3pts)
        * High wind days: 0-10 points (>15days: 10pts, >10days: 7pts, >5days: 3pts)
        * Low humidity days: 0-5 points (>10days: 5pts, >7days: 3pts, >3days: 1pt)]",
    "keyRiskFactors": [
      "[REQUIRED: Primary weather-based risk factor with specific numbers]",
      "[REQUIRED: Primary fire-activity risk factor with specific numbers]",
      "[OPTIONAL: Additional significant risk factor with specific numbers]"
    ],
    "currentConcerns": [
      "[REQUIRED: Most immediate concern with specific measurements]",
      "[REQUIRED: Secondary concern with specific measurements]",
      "[OPTIONAL: Additional relevant concern with specific measurements]"
    ],
    "safetyRecommendations": [
      "[REQUIRED: Most critical safety action based on highest risk factor]",
      "[REQUIRED: Secondary safety recommendation based on second highest risk]",
      "[OPTIONAL: Additional safety measure if needed]"
    ]
  }
}

Calculate risk percentage using:
- Current conditions (50%): temperature, humidity, wind speed, soil moisture
- Fire activity (25%): proximity to fires, total burned area, containment levels
- Historical trends (25%): dry days, wind patterns, moisture trends`;

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
