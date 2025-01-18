import { getWeatherData, getFireData, getGeminiAnalysis } from './utils/apiService.js';

async function testAPIs() {
    try {
        // Test with San Francisco coordinates
        const lat = 37.7749;
        const lon = -122.4194;
        
        console.log('Fetching weather data...');
        const weatherData = await getWeatherData(lat, lon);
        console.log('Weather data:', weatherData);
        
        console.log('\nFetching fire data...');
        const fireData = await getFireData(lat, lon);
        console.log('Fire data:', fireData);
        
        console.log('\nGetting Gemini analysis...');
        const analysis = await getGeminiAnalysis(weatherData, fireData, 'San Francisco');
        console.log('Analysis:', analysis);
    } catch (error) {
        console.error('Error in test:', error);
    }
}

testAPIs();
