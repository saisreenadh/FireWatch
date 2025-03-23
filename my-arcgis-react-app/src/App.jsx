// src/App.jsx
import React, { useState } from 'react';
import ArcGISMap from './ArcGISMap';
import LandingPage from './components/LandingPage';
import './App.css';

function App() {
  const [showLandingPage, setShowLandingPage] = useState(true);

  const handleGetStarted = () => {
    setShowLandingPage(false);
  };

  return (
    <div className="app-container">
      {showLandingPage ? (
        <LandingPage onGetStarted={handleGetStarted} />
      ) : (
        <ArcGISMap />
      )}
    </div>
  );
}

export default App;
