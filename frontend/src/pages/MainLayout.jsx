import React, { useState } from 'react';
import CommonHeader from '../components/CommonHeader.jsx';
import MapBox from '../components/mapbox.jsx';
import ChatPage from './ChatPage.jsx';
import MatchingPage from './MatchingPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import '../styles/MainLayout.css';

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
        
        {currentPage === 'chat' && (
          <ChatPage />
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
