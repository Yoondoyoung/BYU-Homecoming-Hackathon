import React, { useState, useEffect } from 'react';
import '../styles/MatchingPage.css';

function MatchingPage({ onStartChat, unreadMap = {} }) {
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastMatchingAt, setLastMatchingAt] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // 매칭된 유저들 데이터 가져오기
  const fetchMatchedUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('Login required.');
      }

      const response = await fetch('http://localhost:4001/api/matching/matched-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Unable to fetch matched user information.');
      }

      const data = await response.json();
      setMatchedUsers(data.profiles || []);
      setLastMatchingAt(data.lastMatchingAt);
    } catch (err) {
      console.error('매칭된 유저 조회 오류:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 새로운 매칭 실행
  const runNewMatching = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('Login required.');
      }

      const response = await fetch('http://localhost:4001/api/matching/find-matches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Matching failed.');
      }

      const data = await response.json();
      setMatchedUsers(data.matchingProfiles || []);
      setLastMatchingAt(new Date().toISOString());
      setError(null);
    } catch (err) {
      console.error('매칭 실행 오류:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 유저 클릭 핸들러
  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // 모달 닫기
  const closeModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };

  // 대화 시작 핸들러
  const handleStartChat = async (user) => {
    try {
      console.log('대화 시작:', user.nickname);
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Login required.');
      }

      // 추천 질문들 가져오기
      const response = await fetch('http://localhost:4001/api/conversation/topics', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: user.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversation topics');
      }

      const topicsData = await response.json();
      console.log('추천 질문들:', topicsData);

      setShowUserModal(false);
      setSelectedUser(null);

      if (typeof onStartChat === 'function') {
        onStartChat(user, {
          conversationTopics: topicsData
        });
      }

    } catch (error) {
      console.error('대화 시작 오류:', error);
      setShowUserModal(false);
      setSelectedUser(null);

      if (typeof onStartChat === 'function') {
        onStartChat(user, { conversationTopics: null });
      }
    }
  };

  useEffect(() => {
    fetchMatchedUsers();
  }, []);

  return (
    <div className="matching-page">
      <div className="matching-content">
        <div className="matching-header">
          <h2>Friend Matching</h2>
          <p>Meet people who share similar interests with you!</p>
          
          <div className="matching-actions">
            <button 
              className="refresh-button"
              onClick={fetchMatchedUsers}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button 
              className="new-matching-button"
              onClick={runNewMatching}
              disabled={loading}
            >
              {loading ? 'Matching...' : ' Find New Matches '}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading matched users...</p>
          </div>
        ) : matchedUsers.length === 0 ? (
          <div className="no-matches">
            <h3>No matched users found</h3>
            <p>Try running a new matching!</p>
          </div>
        ) : (
          <div className="matched-users-section">
            <div className="section-header">
              <h3>Matched Friends</h3>
              <p className="match-count">Total {matchedUsers.length} people</p>
              {lastMatchingAt && (
                <p className="last-matching">
                  Last matched: {new Date(lastMatchingAt).toLocaleString('en-US')}
                </p>
              )}
              <p className="scroll-hint">← Scroll left and right to see more friends →</p>
          </div>
          
            {/* 매칭된 유저들 표시 영역 */}
            <div className="matched-users-container">
              <div className="users-scroll-container">
                <div className="users-horizontal-scroll">
                  {matchedUsers.map((user) => {
                    const unreadEntry = unreadMap[user.id];
                    const hasUnread = !!unreadEntry;
                    const unreadMessage = unreadEntry?.message;
                    const unreadTime = unreadEntry?.time;
                    const unreadCount = unreadEntry?.unreadCount || 0;

                    return (
                      <div 
                        key={user.id} 
                        className={`user-card ${hasUnread ? 'has-unread' : ''}`}
                        onClick={() => handleUserClick(user)}
                      >
                        <div className="profile-image-container">
                          {user.profile_image_url ? (
                            <img 
                              src={user.profile_image_url} 
                              alt={user.nickname}
                              className="profile-image"
                            />
                          ) : (
                            <div className="default-profile-image">
                              {user.nickname ? user.nickname.charAt(0).toUpperCase() : '?'}
                            </div>
                          )}
                          <div className="similarity-badge">
                            {user.similarity_score}%
                          </div>
                          {hasUnread && (
                            <span className="unread-dot" aria-label="Unread message">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="user-info">
                          <h4 className="user-nickname">{user.nickname || 'Anonymous'}</h4>
                          <p className="user-major">{user.major || 'Major not specified'}</p>
                          {hasUnread && (
                            <div className="unread-preview">
                              <span className="unread-label">New message</span>
                              {unreadMessage && <span className="unread-text">{unreadMessage}</span>}
                              {unreadTime && <span className="unread-time">{unreadTime}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 유저 상세 정보 모달 */}
      {showUserModal && selectedUser && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Friend Profile</h3>
              <button className="close-button" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="profile-section">
                <div className="modal-profile-image-container">
                  {selectedUser.profile_image_url ? (
                    <img 
                      src={selectedUser.profile_image_url} 
                      alt={selectedUser.nickname}
                      className="modal-profile-image"
                    />
                  ) : (
                    <div className="modal-default-profile-image">
                      {selectedUser.nickname ? selectedUser.nickname.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  <div className="modal-similarity-badge">
                    {selectedUser.similarity_score}% Similarity
                  </div>
                </div>
                
                <div className="profile-info">
                  <h2 className="modal-nickname">{selectedUser.nickname || 'Anonymous'}</h2>
                  <p className="modal-major">{selectedUser.major || 'Major not specified'}</p>
                </div>
              </div>

              <div className="details-section">
                <div className="detail-item">
                  <span className="detail-label">Gender</span>
                  <span className="detail-value">{selectedUser.gender || 'Not specified'}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Hobby</span>
                  <span className="detail-value">{selectedUser.hobby || 'Not specified'}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Interests</span>
                  <span className="detail-value">{selectedUser.interests || 'Not specified'}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Favorite Foods</span>
                  <span className="detail-value">{selectedUser.favorite_foods || 'Not specified'}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Current Classes</span>
                  <span className="detail-value">{selectedUser.classes || 'Not specified'}</span>
          </div>
          
                {selectedUser.bio && (
                  <div className="detail-item bio-item">
                    <span className="detail-label">Bio</span>
                    <span className="detail-value bio-text">{selectedUser.bio}</span>
                  </div>
                )}
          </div>
        </div>
        
            <div className="modal-footer">
              <button
                className="start-chat-button"
                onClick={() => handleStartChat(selectedUser)}
              >
                💬 Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchingPage;
