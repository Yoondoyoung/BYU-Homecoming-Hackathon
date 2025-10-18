import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CommonHeader.css';

function CommonHeader({ currentPage, onPageChange }) {
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

  const handleProfileClick = () => {
    onPageChange('profile');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="common-header">
      <div className="header-content">
        <div className="header-left">
          <div className="header-text">
            <h1>BYU Homecoming Hackathon</h1>
            <p>Interactive Platform</p>
          </div>
        </div>
        
        <div className="header-center">
          <div className="page-switcher">
            <button 
              className={`page-button ${currentPage === 'map' ? 'active' : ''}`}
              onClick={() => onPageChange('map')}
            >
              Map
            </button>
            <button 
              className={`page-button ${currentPage === 'matching' ? 'active' : ''}`}
              onClick={() => onPageChange('matching')}
            >
              Matching
            </button>
          </div>
        </div>

        {user && (
          <div className="header-right">
            <div className="user-info">
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
              <button className="profile-button" onClick={handleProfileClick}>
                <div className="profile-avatar">
                  {user.profile_image ? (
                    <img src={user.profile_image} alt="Profile" />
                  ) : (
                    <div className="avatar-initials">
                      {getInitials(user.name || user.nickname)}
                    </div>
                  )}
                </div>
                <span className="profile-nickname">{user.nickname || user.name || 'User'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CommonHeader;
