import React, { useState } from 'react';
import './ChatInterface.css';

function ChatInterface({ onSearch }) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSearch(message);
      setMessage('');
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        Location Search
      </div>
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter a city name..."
          className="chat-input"
        />
        <button type="submit" className="chat-button">
          Search
        </button>
      </form>
    </div>
  );
}

export default ChatInterface;
