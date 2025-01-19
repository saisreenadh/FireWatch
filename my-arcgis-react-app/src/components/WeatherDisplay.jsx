import React from 'react';
import './WeatherDisplay.css';

const calculateRiskPercentage = (weatherData) => {
  const currentHourIndex = new Date().getHours();
  
  // Get current conditions
  const temperature = weatherData.hourly.temperature_2m[currentHourIndex];
  const humidity = weatherData.hourly.relative_humidity_2m[currentHourIndex];
  const windSpeed = weatherData.hourly.wind_speed_10m[currentHourIndex];
  const precipitation = weatherData.hourly.precipitation[currentHourIndex];
  const soilMoisture = weatherData.hourly.soil_moisture_1_to_3cm[currentHourIndex];

  // Risk factors (adjust weights based on importance)
  let risk = 0;

  // Temperature risk (higher temperature = higher risk)
  if (temperature > 30) risk += 30;
  else if (temperature > 25) risk += 20;
  else if (temperature > 20) risk += 10;

  // Humidity risk (lower humidity = higher risk)
  if (humidity < 30) risk += 30;
  else if (humidity < 40) risk += 20;
  else if (humidity < 50) risk += 10;

  // Wind speed risk (higher wind = higher risk)
  if (windSpeed > 30) risk += 20;
  else if (windSpeed > 20) risk += 15;
  else if (windSpeed > 10) risk += 10;

  // Soil moisture risk (lower moisture = higher risk)
  if (soilMoisture < 0.1) risk += 20;
  else if (soilMoisture < 0.2) risk += 15;
  else if (soilMoisture < 0.3) risk += 10;

  return Math.min(risk, 100); // Cap at 100%
};

const WeatherDisplay = ({ weatherData }) => {
  if (!weatherData) return null;

  const currentHourIndex = new Date().getHours();
  const riskPercentage = calculateRiskPercentage(weatherData);
  
  const getRiskLevel = (percentage) => {
    if (percentage >= 70) return { level: 'Extreme', color: '#ff0000' };
    if (percentage >= 50) return { level: 'High', color: '#ff9900' };
    if (percentage >= 30) return { level: 'Moderate', color: '#ffff00' };
    return { level: 'Low', color: '#00ff00' };
  };

  const risk = getRiskLevel(riskPercentage);

  return (
    <div className="weather-display">
      <h2>Current Weather Conditions</h2>
      
      <div className="risk-indicator" style={{ backgroundColor: risk.color }}>
        <h3>Fire Risk Level: {risk.level}</h3>
        <div className="risk-percentage">{riskPercentage}%</div>
      </div>

      <div className="weather-grid">
        <div className="weather-item">
          <h4>Temperature</h4>
          <p>{weatherData.hourly.temperature_2m[currentHourIndex]}°C</p>
        </div>
        
        <div className="weather-item">
          <h4>Humidity</h4>
          <p>{weatherData.hourly.relative_humidity_2m[currentHourIndex]}%</p>
        </div>
        
        <div className="weather-item">
          <h4>Wind Speed</h4>
          <p>{weatherData.hourly.wind_speed_10m[currentHourIndex]} km/h</p>
        </div>
        
        <div className="weather-item">
          <h4>Wind Direction</h4>
          <p>{weatherData.hourly.wind_direction_10m[currentHourIndex]}°</p>
        </div>
        
        <div className="weather-item">
          <h4>Wind Gusts</h4>
          <p>{weatherData.hourly.wind_gusts_10m[currentHourIndex]} km/h</p>
        </div>
        
        <div className="weather-item">
          <h4>Precipitation</h4>
          <p>{weatherData.hourly.precipitation[currentHourIndex]} mm</p>
        </div>
        
        <div className="weather-item">
          <h4>Precipitation Probability</h4>
          <p>{weatherData.hourly.precipitation_probability[currentHourIndex]}%</p>
        </div>
        
        <div className="weather-item">
          <h4>Soil Moisture</h4>
          <p>{weatherData.hourly.soil_moisture_1_to_3cm[currentHourIndex]} m³/m³</p>
        </div>
      </div>
    </div>
  );
};

export default WeatherDisplay;
