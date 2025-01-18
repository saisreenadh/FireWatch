import React, { useState } from 'react';
import { getWeatherData, getFireData, getGeminiAnalysis } from '../utils/apiService';

function ChatBot({ onCitySearch }) {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Add user message to chat history
    const userMessage = { type: 'user', text: message };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      // First, get the coordinates from the parent component
      const coordinates = await onCitySearch(message);
      
      if (coordinates) {
        // Add loading message
        setChatHistory(prev => [...prev, { type: 'system', text: 'Analyzing location data...' }]);

        // Fetch weather and fire data
        const weatherData = await getWeatherData(coordinates.latitude, coordinates.longitude);
        const fireData = await getFireData(coordinates.latitude, coordinates.longitude);

        // Get AI analysis
        const analysis = await getGeminiAnalysis(weatherData, fireData, message);

        // Add AI response to chat history
        setChatHistory(prev => [
          ...prev.filter(msg => msg.text !== 'Analyzing location data...'),
          { 
            type: 'system',
            text: analysis
          }
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      setChatHistory(prev => [...prev, { 
        type: 'system', 
        text: 'Sorry, I encountered an error while analyzing this location.' 
      }]);
    } finally {
      setIsLoading(false);
      setMessage('');
    }
  };

  return (
    <div className="chatbot">
      <div className="chat-history">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.type}`}>
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className="chat-message system loading">
            Analyzing...
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="chat-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter a city name..."
          className="chat-input-field"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="chat-submit"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default ChatBot;
