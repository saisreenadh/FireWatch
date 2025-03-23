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
        // Fetch active fires data from ArcGIS service
        const activeFiresResponse = await fetch(
            `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Active_Fires/FeatureServer/0/query?where=1%3D1&outFields=*&geometry=${lon},${lat}&geometryType=esriGeometryPoint&distance=50&units=esriSRUnit_Kilometer&returnGeometry=true&f=json`
        );
        const activeFiresData = await activeFiresResponse.json();

        // Fetch fire perimeters data from ArcGIS service
        const perimetersResponse = await fetch(
            `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0/query?where=1%3D1&outFields=*&geometry=${lon},${lat}&geometryType=esriGeometryPoint&distance=50&units=esriSRUnit_Kilometer&returnGeometry=true&f=json`
        );
        const perimetersData = await perimetersResponse.json();

        // Process the data
        const activeFiresCount = activeFiresData.features ? activeFiresData.features.length : 0;
        const perimetersCount = perimetersData.features ? perimetersData.features.length : 0;
        
        // Calculate total burned acres
        let totalBurnedAcres = 0;
        if (perimetersData.features) {
            totalBurnedAcres = perimetersData.features.reduce((total, feature) => {
                return total + (feature.attributes.GISAcres || 0);
            }, 0);
        }

        // Find nearest fire if any
        let nearestFire = null;
        if (activeFiresCount > 0) {
            const fires = activeFiresData.features.map(feature => {
                const fireLat = feature.geometry.y;
                const fireLon = feature.geometry.x;
                const distance = calculateDistance(lat, lon, fireLat, fireLon);
                return {
                    name: feature.attributes.IncidentName || 'Unnamed Fire',
                    distance: distance.toFixed(1),
                    containment: feature.attributes.PercentContained ? `${feature.attributes.PercentContained}%` : 'Unknown',
                    size: feature.attributes.DailyAcres || 0
                };
            });
            
            // Sort by distance
            fires.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
            nearestFire = fires[0];
        }

        // Determine risk level based on fire proximity and count
        let riskLevel = "low";
        if (activeFiresCount > 0 && nearestFire && parseFloat(nearestFire.distance) < 10) {
            riskLevel = "high";
        } else if (activeFiresCount > 0 || perimetersCount > 0) {
            riskLevel = "moderate";
        }

        return {
            active_fires_count: activeFiresCount,
            perimeters_count: perimetersCount,
            total_burned_acres: totalBurnedAcres,
            nearest_fire: nearestFire,
            risk_level: riskLevel,
            conditions: {
                drought_index: 0.6, // This would ideally come from a drought API
                vegetation_dryness: "medium", // This would ideally be calculated from weather data
                recent_fires: activeFiresCount
            }
        };
    } catch (error) {
        console.error('Error fetching fire data:', error);
        return { 
            risk_level: 'unknown',
            active_fires_count: 0,
            perimeters_count: 0,
            total_burned_acres: 0
        };
    }
}

export async function getGeminiAnalysis(weatherData, fireData, cityName) {
    try {
        // Check if we have a valid API key
        const apiKey = getEnvVar('VITE_GEMINI_API_KEY');
        if (!apiKey) {
            console.warn('No Gemini API key found. Using mock analysis data.');
            return generateMockAnalysis(weatherData, fireData, cityName);
        }
        
        const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-pro' });

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

        // Determine risk percentage based on fire data and weather conditions
        let riskPercentage = 0;
        
        // Fire activity factors (50%)
        if (fireData.active_fires_count > 0) {
            riskPercentage += 25; // Active fires present
            
            // Nearby fire factor
            if (fireData.nearest_fire && parseFloat(fireData.nearest_fire.distance) < 10) {
                riskPercentage += 25; // Very close fire
            } else if (fireData.nearest_fire && parseFloat(fireData.nearest_fire.distance) < 30) {
                riskPercentage += 15; // Moderately close fire
            } else {
                riskPercentage += 5; // Distant fire
            }
        }
        
        // Weather factors (50%)
        // High temperature risk
        if (currentConditions.temperature > 30) riskPercentage += 10;
        else if (currentConditions.temperature > 25) riskPercentage += 5;
        
        // Low humidity risk
        if (currentConditions.humidity < 20) riskPercentage += 15;
        else if (currentConditions.humidity < 30) riskPercentage += 10;
        else if (currentConditions.humidity < 40) riskPercentage += 5;
        
        // High wind risk
        if (currentConditions.windSpeed > 30) riskPercentage += 15;
        else if (currentConditions.windSpeed > 20) riskPercentage += 10;
        else if (currentConditions.windSpeed > 10) riskPercentage += 5;
        
        // Low precipitation risk
        if (historicalData.dryDays > 20) riskPercentage += 10;
        else if (historicalData.dryDays > 10) riskPercentage += 5;

        // Cap at 100%
        riskPercentage = Math.min(riskPercentage, 100);
        
        // Determine risk level based on percentage
        let riskLevel = "Low";
        if (riskPercentage >= 70) riskLevel = "High";
        else if (riskPercentage >= 40) riskLevel = "Medium";

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

Risk Assessment:
Risk Level: ${riskLevel}
Risk Percentage: ${riskPercentage}%

Provide a practical fire risk assessment considering:
1. Actual fire presence and behavior in the area
2. Current weather that could affect fire spread (wind, humidity, temperature)
3. Recent weather patterns indicating fire-prone conditions
4. Ground conditions (soil moisture, precipitation)

Format the response exactly like this:
{
  "cityName": "${cityName}",
  "fireRiskAssessment": {
    "riskLevel": "${riskLevel}",
    "riskPercentage": "${riskPercentage}%",
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
}`;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return JSON.parse(response.text());
        } catch (aiError) {
            console.error('Error with Gemini API:', aiError);
            // Fall back to mock data if API fails
            return generateMockAnalysis(weatherData, fireData, cityName, riskLevel, riskPercentage);
        }
    } catch (error) {
        console.error('Error getting analysis:', error);
        return generateMockAnalysis(weatherData, fireData, cityName);
    }
}

// Generate mock analysis data when API is unavailable
function generateMockAnalysis(weatherData, fireData, cityName, riskLevel = null, riskPercentage = null) {
    // Determine risk level based on fire data if not provided
    if (!riskLevel) {
        if (fireData.active_fires_count > 0 && fireData.nearest_fire && parseFloat(fireData.nearest_fire.distance) < 20) {
            riskLevel = "High";
            riskPercentage = "75%";
        } else if (fireData.active_fires_count > 0 || fireData.perimeters_count > 0) {
            riskLevel = "Medium";
            riskPercentage = "45%";
        } else {
            riskLevel = "Low";
            riskPercentage = "15%";
        }
    } else if (!riskPercentage) {
        riskPercentage = riskLevel === "High" ? "75%" : riskLevel === "Medium" ? "45%" : "15%";
    }
    
    // Generate appropriate risk factors based on level
    const keyRiskFactors = [];
    const currentConcerns = [];
    const safetyRecommendations = [];
    
    // Common factors for all risk levels
    keyRiskFactors.push("Current weather conditions");
    
    if (fireData.active_fires_count > 0) {
        keyRiskFactors.push(`${fireData.active_fires_count} active fires within 50km`);
        if (fireData.nearest_fire) {
            currentConcerns.push(`Fire "${fireData.nearest_fire.name}" is ${fireData.nearest_fire.distance}km away`);
        }
    } else {
        keyRiskFactors.push("No active fires in immediate area");
    }
    
    // Add risk-level specific information
    if (riskLevel === "High") {
        currentConcerns.push("Potential for rapid fire spread due to current conditions");
        currentConcerns.push("Evacuation routes may become compromised if fire activity increases");
        
        safetyRecommendations.push("Stay alert and monitor official emergency channels");
        safetyRecommendations.push("Prepare an evacuation plan and emergency kit");
        safetyRecommendations.push("Clear flammable materials from around your home");
    } else if (riskLevel === "Medium") {
        currentConcerns.push("Changing weather conditions could increase fire risk");
        currentConcerns.push("Limited firefighting resources due to multiple incidents");
        
        safetyRecommendations.push("Review your emergency preparedness plan");
        safetyRecommendations.push("Stay informed about local fire conditions");
    } else {
        currentConcerns.push("Minimal immediate fire concerns");
        currentConcerns.push("Seasonal changes may affect future fire risk");
        
        safetyRecommendations.push("Maintain awareness of fire safety practices");
        safetyRecommendations.push("Use this time to prepare for future fire seasons");
    }
    
    return {
        cityName: cityName,
        fireRiskAssessment: {
            riskLevel: riskLevel,
            riskPercentage: riskPercentage,
            keyRiskFactors: keyRiskFactors,
            currentConcerns: currentConcerns,
            safetyRecommendations: safetyRecommendations
        }
    };
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
