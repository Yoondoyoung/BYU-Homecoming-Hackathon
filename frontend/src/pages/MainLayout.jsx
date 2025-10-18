import React, { useState, useEffect } from 'react';
import CommonHeader from '../components/CommonHeader.jsx';
import MapBox from '../components/mapbox.jsx';
import ChatPage from './ChatPage.jsx';
import MatchingPage from './MatchingPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import '../styles/MainLayout.css';

function MainLayout() {
  const [currentPage, setCurrentPage] = useState('map');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // localStorage에서 사용자 정보 가져오기
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleUserUpdate = () => {
    // 사용자 정보 업데이트 시 localStorage에서 다시 가져오기
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  };

  return (
    <div className="main-layout">
      <CommonHeader 
        currentPage={currentPage} 
        onPageChange={handlePageChange}
        user={user}
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
          <ProfilePage onUserUpdate={handleUserUpdate} />
        )}
      </div>
    </div>
  );
}

export default MainLayout;
