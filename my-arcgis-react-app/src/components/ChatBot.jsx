import React, { useState, useRef, useEffect } from 'react';
import { getWeatherData, getFireData, getGeminiAnalysis } from '../utils/apiService';
import './ChatBot.css';

function ChatBot({ onCitySearch }) {
    const [messages, setMessages] = useState([{
        type: 'system',
        content: "👋 Hi! I'm your fire safety assistant. Where do you live? Please enter your city name."
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
            // Use the provided onCitySearch to get location and move map
            const location = await onCitySearch(userMessage);
            
            if (location) {
                setUserLocation({
                    city: userMessage,
                    lat: location.latitude,
                    lon: location.longitude
                });

                // Get weather and fire data
                const weatherData = await getWeatherData(location.latitude, location.longitude);
                const fireData = await getFireData(location.latitude, location.longitude);
                const analysis = await getGeminiAnalysis(weatherData, fireData, userMessage);

                // Add AI response to chat
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    content: analysis
                }]);
            } else {
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    content: "I couldn't find that location. Please try another city name."
                }]);
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                type: 'assistant',
                content: "Sorry, I encountered an error. Please try again."
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chatbot-container">
            <div className="chat-history" ref={chatHistoryRef}>
                {messages.map((message, index) => (
                    <div key={index} className={`message ${message.type}`}>
                        {message.type === 'assistant' && typeof message.content === 'object' ? (
                            <div className="stats-container">
                                <h2>🏙️ {message.content.cityName}</h2>
                                <div className="stat-item risk-level">
                                    <span className="stat-label">🚨 Risk Level:</span>
                                    <span className={`stat-value highlight risk-${message.content.fireRiskAssessment.riskLevel.toLowerCase()}`}>
                                        {message.content.fireRiskAssessment.riskLevel} ({message.content.fireRiskAssessment.riskPercentage})
                                    </span>
                                </div>
                                
                                <div className="stat-item">
                                    <span className="stat-label">⚠️ Key Risk Factors:</span>
                                    <ul className="risk-factors-list">
                                        {message.content.fireRiskAssessment.keyRiskFactors.map((factor, i) => (
                                            <li key={i}>🔸 {factor}</li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <div className="stat-item">
                                    <span className="stat-label">🔍 Current Concerns:</span>
                                    <ul className="concerns-list">
                                        {message.content.fireRiskAssessment.currentConcerns.map((concern, i) => (
                                            <li key={i}>❗ {concern}</li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <div className="stat-item">
                                    <span className="stat-label">💡 Safety Recommendations:</span>
                                    <ul className="recommendations-list">
                                        {message.content.fireRiskAssessment.safetyRecommendations.map((rec, i) => (
                                            <li key={i}>✅ {rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            message.content
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="message system">
                        <div className="loading-message">
                            <span className="loading-icon">🔄</span>
                            Analyzing conditions...
                        </div>
                    </div>
                )}
            </div>
            <form onSubmit={handleSubmit} className="chat-input-form">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter a city name..."
                    disabled={loading}
                />
                <button type="submit" disabled={loading}>
                    Send
                </button>
            </form>
        </div>
    );
}

export default ChatBot;
