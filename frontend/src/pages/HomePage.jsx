import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/HomePage.css';

function HomePage() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      setHealthStatus({
        status: 'ERROR',
        message: 'Failed to connect to backend',
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>BYU Homecoming Hackathon</h1>
        <p>Welcome to our hackathon project!</p>
        
        <div className="navigation">
          <Link to="/map" className="nav-button">
            View Interactive Map
          </Link>
          <Link to="/chat" className="nav-button">
            💬 Join Chat Room
          </Link>
        </div>
        
        <div className="health-check">
          <h2>Backend Health Check</h2>
          <button onClick={checkHealth} disabled={loading}>
            {loading ? 'Checking...' : 'Check Health'}
          </button>
          
          {healthStatus && (
            <div className={`health-status ${healthStatus.status.toLowerCase()}`}>
              <h3>Status: {healthStatus.status}</h3>
              <p>{healthStatus.message}</p>
              {healthStatus.timestamp && (
                <p><small>Last checked: {new Date(healthStatus.timestamp).toLocaleString()}</small></p>
              )}
              {healthStatus.error && (
                <p className="error">Error: {healthStatus.error}</p>
              )}
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default HomePage;
