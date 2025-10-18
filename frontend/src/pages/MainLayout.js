import React, { useState } from 'react';
import CommonHeader from '../components/CommonHeader';
import MapBox from '../components/mapbox';
import MatchingPage from './MatchingPage';
import ProfilePage from './ProfilePage';
import './MainLayout.css';

function MainLayout() {
  const [currentPage, setCurrentPage] = useState('map');

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="main-layout">
      <CommonHeader 
        currentPage={currentPage} 
        onPageChange={handlePageChange} 
      />
      
      <div className="main-content">
        {currentPage === 'map' && (
          <div className="map-content">
            <MapBox />
          </div>
        )}
        
        {currentPage === 'matching' && (
          <MatchingPage />
        )}
        
        {currentPage === 'profile' && (
          <ProfilePage />
        )}
      </div>
    </div>
  );
}

export default MainLayout;
