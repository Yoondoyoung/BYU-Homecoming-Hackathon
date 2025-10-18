import React, { useState, useEffect } from 'react';
import CommonHeader from '../components/CommonHeader.jsx';
import MapBox from '../components/mapbox.jsx';
import MatchingPage from './MatchingPage.jsx';
import LeaderboardPage from './LeaderboardPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import SpotChat from '../components/SpotChat.jsx';
import io from 'socket.io-client';
import '../styles/MainLayout.css';
import '../styles/MapPage.css';

function MainLayout() {
  const [currentPage, setCurrentPage] = useState('map');
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [nickname, setNickname] = useState('Anonymous');
  const [currentSpot, setCurrentSpot] = useState(null);
  const [isSpotChatOpen, setIsSpotChatOpen] = useState(false);

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

  useEffect(() => {
    const newSocket = io('http://localhost:4001');
    setSocket(newSocket);

    let nicknameToUse = 'Anonymous';
    const userData = localStorage.getItem('user');

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        nicknameToUse = parsedUser.nickname || parsedUser.name || 'Anonymous';
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    setNickname(nicknameToUse);
    newSocket.emit('setNickname', nicknameToUse);

    return () => {
      newSocket.emit('leaveSpotChat');
      newSocket.close();
    };
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

  const handleSpotEnter = (spot) => {
    if (spot && currentSpot && spot.id !== currentSpot.id && socket && isSpotChatOpen) {
      socket.emit('leaveSpotChat');
    }
    setCurrentSpot(spot);
  };

  const handleSpotLeave = () => {
    if (socket) {
      socket.emit('leaveSpotChat');
    }
    setCurrentSpot(null);
    setIsSpotChatOpen(false);
  };

  const joinSpotChat = (spot) => {
    if (!socket || !spot) return;
    socket.emit('joinSpotChat', {
      spotId: spot.id,
      spotName: spot.name,
    });
    setIsSpotChatOpen(true);
  };

  useEffect(() => {
    if (!socket || !currentSpot || !isSpotChatOpen) return;
    socket.emit('joinSpotChat', {
      spotId: currentSpot.id,
      spotName: currentSpot.name,
    });
  }, [socket, currentSpot, isSpotChatOpen]);

  const closeSpotChat = () => {
    if (socket) {
      socket.emit('leaveSpotChat');
    }
    setIsSpotChatOpen(false);
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
          <div className="map-page-layout">
            <div className="map-section">
              <MapBox 
                onSpotEnter={handleSpotEnter}
                onSpotLeave={handleSpotLeave}
                currentSpot={currentSpot}
              />
            </div>
            <div className="chat-section">
              {currentSpot && isSpotChatOpen ? (
                <SpotChat
                  socket={socket}
                  currentSpot={currentSpot}
                  nickname={nickname}
                  onClose={closeSpotChat}
                  isSidebar={true}
                />
              ) : (
                <div className="no-spot-message">
                  <div className="no-spot-content">
                    {currentSpot ? (
                      <>
                        <h3>💬 Ready to join {currentSpot.name}?</h3>
                        <p>Open the spot chat to talk with people nearby.</p>
                        <button
                          className="join-chat-button"
                          onClick={() => joinSpotChat(currentSpot)}
                        >
                          💬 Join Chat
                        </button>
                      </>
                    ) : (
                      <>
                        <h3>📍 No Active Spot</h3>
                        <p>Move to a building to start chatting with people nearby!</p>
                        <div className="spot-instructions">
                          <div className="instruction-item">
                            <span className="instruction-icon">🚶‍♂️</span>
                            <span>Walk to any building on the map</span>
                          </div>
                          <div className="instruction-item">
                            <span className="instruction-icon">💬</span>
                            <span>Open the chat once you're inside</span>
                          </div>
                          <div className="instruction-item">
                            <span className="instruction-icon">🗳️</span>
                            <span>Vote on building preferences</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {currentPage === 'matching' && (
          <MatchingPage />
        )}
        
        {currentPage === 'leaderboard' && (
          <LeaderboardPage />
        )}
        
        {currentPage === 'profile' && (
          <ProfilePage onUserUpdate={handleUserUpdate} />
        )}
      </div>
    </div>
  );
}

export default MainLayout;
