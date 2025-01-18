import React, { useState, useRef, useEffect } from 'react';
import { getWeatherData, getFireData, getGeminiAnalysis } from '../utils/apiService';
import './ChatBot.css';

function ChatBot() {
    const [messages, setMessages] = useState([{
        type: 'system',
        content: "Hi! I'm your fire safety assistant. Where do you live? Please enter your city name."
    }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const chatHistoryRef = useRef(null);

    useEffect(() => {
        if (chatHistoryRef.current) {
            chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');
        setLoading(true);

        // Add user message to chat
        setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

        try {
            if (!userLocation) {
                // First message - get user's location
                const geocodeUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?address=${encodeURIComponent(userMessage)}&f=json`;
                const response = await fetch(geocodeUrl);
                const data = await response.json();

                if (data.candidates && data.candidates.length > 0) {
                    const location = data.candidates[0];
                    setUserLocation({
                        city: userMessage,
                        lat: location.location.y,
                        lon: location.location.x
                    });

                    // Get weather and fire data
                    const weatherData = await getWeatherData(location.location.y, location.location.x);
                    const fireData = await getFireData(location.location.y, location.location.x);
                    const analysis = await getGeminiAnalysis(weatherData, fireData, userMessage);

                    setMessages(prev => [...prev, {
                        type: 'system',
                        content: analysis + "\n\nYou can ask me specific questions about fire safety in your area, or type another city name to check a different location."
                    }]);
                } else {
                    setMessages(prev => [...prev, {
                        type: 'system',
                        content: "I couldn't find that location. Please try entering a city name."
                    }]);
                }
            } else {
                // Subsequent messages - handle questions or new location checks
                if (userMessage.toLowerCase().includes('fire') || 
                    userMessage.toLowerCase().includes('weather') || 
                    userMessage.toLowerCase().includes('risk')) {
                    // Get updated data for existing location
                    const weatherData = await getWeatherData(userLocation.lat, userLocation.lon);
                    const fireData = await getFireData(userLocation.lat, userLocation.lon);
                    const analysis = await getGeminiAnalysis(weatherData, fireData, userLocation.city);
                    
                    setMessages(prev => [...prev, {
                        type: 'system',
                        content: analysis
                    }]);
                } else {
                    // Try to geocode as new location
                    const geocodeUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?address=${encodeURIComponent(userMessage)}&f=json`;
                    const response = await fetch(geocodeUrl);
                    const data = await response.json();

                    if (data.candidates && data.candidates.length > 0) {
                        const location = data.candidates[0];
                        setUserLocation({
                            city: userMessage,
                            lat: location.location.y,
                            lon: location.location.x
                        });

                        const weatherData = await getWeatherData(location.location.y, location.location.x);
                        const fireData = await getFireData(location.location.y, location.location.x);
                        const analysis = await getGeminiAnalysis(weatherData, fireData, userMessage);

                        setMessages(prev => [...prev, {
                            type: 'system',
                            content: analysis
                        }]);
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                type: 'system',
                content: "Sorry, I encountered an error. Please try again."
            }]);
        }

        setLoading(false);
    };

    return (
        <div className="chatbot">
            <div className="chat-history" ref={chatHistoryRef}>
                {messages.map((message, index) => (
                    <div key={index} className={`chat-message ${message.type}`}>
                        {message.content}
                    </div>
                ))}
                {loading && (
                    <div className="chat-message system">
                        Loading...
                    </div>
                )}
            </div>
            <form onSubmit={handleSubmit} className="chat-input">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter a city name or ask a question..."
                    className="chat-input-field"
                />
                <button type="submit" className="send-button" disabled={loading}>
                    Send
                </button>
            </form>
        </div>
    );
}

export default ChatBot;
