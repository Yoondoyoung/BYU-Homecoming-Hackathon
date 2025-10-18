import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MapPage.css';

function MapPage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    try {
      // 백엔드 로그아웃 API 호출
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch('http://localhost:4001/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // 백엔드 로그아웃 실패해도 프론트엔드에서는 로그아웃 처리
    } finally {
      // localStorage에서 사용자 정보 제거
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      // 로그인 페이지로 리다이렉트
      navigate('/login');
    }
  };

  return (
    <div className="map-page">
      <div className="map-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Interactive Map</h1>
            <p>BYU Campus Map with Real-time Location Tracking</p>
          </div>
          {user && (
            <div className="user-info">
              <div className="user-details">
                <span className="welcome-text">Welcome,</span>
                <span className="nickname">{user.nickname || user.name || 'User'}</span>
              </div>
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="map-content">
        <div className="coming-soon">
          <h2>Map Coming Soon!</h2>
          <p>Interactive map feature will be implemented here.</p>
        </div>
      </div>
    </div>
  );
}

export default MapPage;
