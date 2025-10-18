import React, { useState, useEffect, useCallback } from 'react';
import CommonHeader from '../components/CommonHeader.jsx';
import MapBox from '../components/mapbox.jsx';
import MatchingPage from './MatchingPage.jsx';
import LeaderboardPage from './LeaderboardPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import SpotChat from '../components/SpotChat.jsx';
import DirectChat from '../components/DirectChat.jsx';
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
  const [isDirectChatOpen, setIsDirectChatOpen] = useState(false);
  const [directChatPartner, setDirectChatPartner] = useState(null);
  const [isDirectChatInitiator, setIsDirectChatInitiator] = useState(false);
  const [directConversationId, setDirectConversationId] = useState(null);
  const [unreadDirectByUser, setUnreadDirectByUser] = useState({});
  const [preloadedMessages, setPreloadedMessages] = useState([]);
  const [directConversationTopics, setDirectConversationTopics] = useState(null);

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

    return () => {
      newSocket.emit('leaveSpotChat');
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const payload = user?.id
      ? {
          nickname,
          userId: user.id,
          profileImage: user.profile_image_url
        }
      : { nickname };
    socket.emit('setNickname', payload);
  }, [socket, nickname, user?.id, user?.profile_image_url]);

  useEffect(() => {
    if (user?.nickname) {
      setNickname(user.nickname);
    }
  }, [user?.nickname]);

  useEffect(() => {
    if (!user?.id) {
      setUnreadDirectByUser({});
    }
  }, [user?.id]);

  const computeConversationId = useCallback((idA, idB) => {
    if (!idA || !idB) return null;
    const [first, second] = [String(idA), String(idB)].sort();
    return `${first}-${second}`;
  }, []);

  const markConversationAsRead = useCallback((partnerId) => {
    if (!partnerId) return;
    setUnreadDirectByUser((prev) => {
      if (!prev || !prev[partnerId]) return prev;
      const updated = { ...prev };
      delete updated[partnerId];
      return updated;
    });
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

  const openDirectChat = useCallback(
    (
      partner,
      {
        initiator = false,
        conversationId,
        preloadMessages = [],
        conversationTopics
      } = {}
    ) => {
      if (!partner || !user?.id || !socket) return;
      const finalConversationId = conversationId || computeConversationId(user.id, partner.id);
      if (!finalConversationId) return;

      const normalizedPreload = Array.isArray(preloadMessages)
        ? [...preloadMessages]
        : [preloadMessages].filter(Boolean);

      setDirectChatPartner(partner);
      setDirectConversationId(finalConversationId);
      setIsDirectChatInitiator(initiator);
      setIsDirectChatOpen(true);
      setPreloadedMessages(normalizedPreload);
      if (conversationTopics !== undefined) {
        setDirectConversationTopics(conversationTopics);
      }
      markConversationAsRead(partner.id);
    },
    [user?.id, socket, computeConversationId, markConversationAsRead]
  );

  const handleStartDirectChat = useCallback(
    (partner, options = {}) => {
      if (!partner) return;
      const unreadEntry = unreadDirectByUser[partner.id];
      const preloadMessages =
        options.preloadMessages ??
        unreadEntry?.previewMessages ??
        unreadEntry?.messages ??
        [];

      const conversationTopics =
        options.conversationTopics ??
        directConversationTopics ??
        undefined;

      openDirectChat(partner, {
        initiator: true,
        preloadMessages,
        conversationTopics
      });
    },
    [openDirectChat, unreadDirectByUser, directConversationTopics]
  );

  const handleCloseDirectChat = useCallback(() => {
    if (directChatPartner?.id) {
      markConversationAsRead(directChatPartner.id);
    }
    setIsDirectChatOpen(false);
    setDirectChatPartner(null);
    setDirectConversationId(null);
    setIsDirectChatInitiator(false);
    setPreloadedMessages([]);
    setDirectConversationTopics(null);
  }, [directChatPartner, markConversationAsRead]);

  useEffect(() => {
    if (!socket || !user?.id) return;

    const addUnreadEntry = (fromUser, payload = {}) => {
      if (!fromUser?.id) return;
      const partnerId = fromUser.id;

      setUnreadDirectByUser((prev) => {
        const prevEntry = prev?.[partnerId];
        const preloadListRaw = payload.preloadMessages;
        const preloadMessages = Array.isArray(preloadListRaw)
          ? preloadListRaw
          : preloadListRaw
          ? [preloadListRaw]
          : [];
        const messageTime = payload.time || new Date().toLocaleTimeString();
        const messageContent = payload.message || prevEntry?.message || '';
        const notificationEntry = {
          ...prevEntry,
          ...payload,
          fromUser,
          conversationId:
            payload.conversationId || prevEntry?.conversationId || computeConversationId(user.id, partnerId),
          message: messageContent,
          time: messageTime,
          unreadCount: (prevEntry?.unreadCount || 0) + 1
        };

        const combinedMessages = [...(prevEntry?.messages || [])];

        preloadMessages.forEach((msg) => {
          if (msg && typeof msg === 'object') {
            combinedMessages.push({
              conversationId: msg.conversationId || notificationEntry.conversationId,
              senderId: msg.senderId || fromUser.id,
              senderNickname: msg.senderNickname || fromUser.nickname || fromUser.name || 'Friend',
              message: msg.message || '',
              time: msg.time || messageTime,
              type: msg.type || 'user'
            });
          }
        });

        if (messageContent) {
          combinedMessages.push({
            conversationId: notificationEntry.conversationId,
            senderId: fromUser.id,
            senderNickname: fromUser.nickname || fromUser.name || 'Friend',
            message: messageContent,
            time: messageTime,
            type: payload.type || 'user'
          });
        }

        notificationEntry.messages = combinedMessages.slice(-20);

        notificationEntry.previewMessages = notificationEntry.messages;

        return {
          ...prev,
          [partnerId]: notificationEntry
        };
      });
    };

    const handleDirectChatInvite = (payload) => {
      if (!payload?.conversationId || !payload?.fromUser) return;
      if (payload.toUserId && String(payload.toUserId) !== String(user.id)) return;

      const partner = {
        id: payload.fromUser.id,
        nickname: payload.fromUser.nickname || payload.fromUser.name || 'Friend',
        profile_image_url: payload.fromUser.profile_image_url || null,
        major: payload.fromUser.major || null,
        hobby: payload.fromUser.hobby || null
      };

      const conversationId = payload.conversationId || computeConversationId(payload.fromUser.id, user.id);
      const preloadMessages = payload.metadata?.preloadMessages || [];
      const isCurrentChatOpen =
        isDirectChatOpen &&
        directChatPartner &&
        String(directChatPartner.id) === String(partner.id);

      if (isCurrentChatOpen) {
        markConversationAsRead(partner.id);
        return;
      }

      addUnreadEntry(partner, {
        conversationId,
        message:
          payload.metadata?.preview || `${partner.nickname || 'Friend'} started a chat with you`,
        time: payload.createdAt,
        isInvite: true,
        type: 'system',
        preloadMessages
      });
    };

    const handleDirectMessageNotification = (payload) => {
      if (!payload?.conversationId || !payload?.fromUser) return;
      if (payload.isSelf) {
        // ignore notifications originated from this user (other devices may still need)
        return;
      }

      const partnerId = payload.fromUser.id;
      const isCurrentChatOpen =
        isDirectChatOpen &&
        directChatPartner &&
        String(directChatPartner.id) === String(partnerId);

      if (isCurrentChatOpen) {
        markConversationAsRead(partnerId);
        return;
      }

      addUnreadEntry(payload.fromUser, {
        conversationId: payload.conversationId,
        message: payload.message,
        time: payload.time,
        isInvite: false
      });
    };

    socket.on('directChatInvite', handleDirectChatInvite);
    socket.on('directMessageNotification', handleDirectMessageNotification);
    return () => {
      socket.off('directChatInvite', handleDirectChatInvite);
      socket.off('directMessageNotification', handleDirectMessageNotification);
    };
  }, [
    socket,
    user?.id,
    computeConversationId,
    openDirectChat,
    isDirectChatOpen,
    directChatPartner,
    markConversationAsRead
  ]);

  useEffect(() => {
    if (isDirectChatOpen && directChatPartner?.id) {
      markConversationAsRead(directChatPartner.id);
    }
  }, [isDirectChatOpen, directChatPartner, markConversationAsRead]);

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
          <MatchingPage 
            onStartChat={handleStartDirectChat}
            unreadMap={unreadDirectByUser}
          />
        )}
        
        {currentPage === 'leaderboard' && (
          <LeaderboardPage />
        )}
        
        {currentPage === 'profile' && (
          <ProfilePage onUserUpdate={handleUserUpdate} />
        )}
      </div>

      <DirectChat
        socket={socket}
        currentUser={
          user
            ? {
                ...user,
                nickname: nickname || user.nickname || 'You'
              }
            : null
        }
        targetUser={directChatPartner}
        conversationId={directConversationId}
        initialMessages={preloadedMessages}
        isOpen={isDirectChatOpen}
        isInitiator={isDirectChatInitiator}
        onClose={handleCloseDirectChat}
        conversationTopics={directConversationTopics}
      />
    </div>
  );
}

export default MainLayout;
