// src/App.jsx
import React from 'react';
import ArcGISMap from './ArcGISMap';
import ChatBot from './components/ChatBot';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <ChatBot />
      <div className="map-container">
        <ArcGISMap />
      </div>
    </div>
  );
}

export default App;
