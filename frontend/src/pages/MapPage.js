import React from 'react';
import MapBox from '../components/mapbox';
import './MapPage.css';

function MapPage() {
  return (
    <div className="map-page">
      <div className="map-header">
        <h1>Interactive Map</h1>
        <p>BYU Campus Map with Real-time Location Tracking</p>
      </div>
      <div className="map-content">
        <MapBox />
      </div>
    </div>
  );
}

export default MapPage;
