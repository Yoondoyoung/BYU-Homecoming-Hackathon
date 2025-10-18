import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import '../styles/DirectChat.css';

function DirectChat({
  socket,
  currentUser,
  targetUser,
  conversationId: conversationIdProp,
  initialMessages = [],
  isOpen,
  isInitiator = false,
  onClose
}) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [participantCount, setParticipantCount] = useState(1);
  const messagesEndRef = useRef(null);

  const conversationId = useMemo(() => {
    if (conversationIdProp) return conversationIdProp;
    if (!currentUser?.id || !targetUser?.id) return null;
    const [firstId, secondId] = [String(currentUser.id), String(targetUser.id)].sort();
    return `${firstId}-${secondId}`;
  }, [conversationIdProp, currentUser?.id, targetUser?.id]);

  const selfDisplayName = currentUser?.nickname || currentUser?.name || 'You';
  const partnerDisplayName = targetUser?.nickname || targetUser?.name || 'Friend';
  const partnerInitial = partnerDisplayName ? partnerDisplayName.charAt(0).toUpperCase() : '?';

  const resetChatState = useCallback(() => {
    setMessages(initialMessages);
    setMessage('');
    setParticipantCount(1);
  }, [initialMessages]);

  useEffect(() => {
    if (isOpen) {
      setMessages(initialMessages);
    }
  }, [initialMessages, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      resetChatState();
    }
  }, [isOpen, resetChatState]);

  useEffect(() => {
    if (!conversationId || !isOpen) return;
    resetChatState();
  }, [conversationId, targetUser?.id, isOpen, resetChatState]);

  useEffect(() => {
    if (!socket || !isOpen || !conversationId) return;

    const handleDirectMessage = (payload) => {
      if (payload.conversationId !== conversationId) return;
      setMessages((prev) => [...prev, payload]);
    };

    const handleDirectUserCountUpdate = (payload) => {
      if (payload.conversationId !== conversationId) return;
      setParticipantCount(payload.userCount);
    };

    socket.on('directMessage', handleDirectMessage);
    socket.on('directUserCountUpdate', handleDirectUserCountUpdate);

    socket.emit('joinDirectChat', {
      conversationId,
      notifyPartner: isInitiator,
      participants: {
        fromUserId: currentUser?.id,
        fromNickname: selfDisplayName,
        fromProfileImage: currentUser?.profile_image_url,
        fromMajor: currentUser?.major,
        fromHobby: currentUser?.hobby,
        toUserId: targetUser?.id,
        toNickname: partnerDisplayName,
        toProfileImage: targetUser?.profile_image_url
      },
      metadata: {
        initiator: isInitiator
      }
    });

    return () => {
      socket.emit('leaveDirectChat', { conversationId });
      socket.off('directMessage', handleDirectMessage);
      socket.off('directUserCountUpdate', handleDirectUserCountUpdate);
    };
  }, [
    socket,
    isOpen,
    conversationId,
    currentUser?.id,
    targetUser?.id,
    selfDisplayName,
    partnerDisplayName,
    isInitiator,
    currentUser?.profile_image_url,
    targetUser?.profile_image_url
  ]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = () => {
    if (!socket || !conversationId) return;
    if (!currentUser?.id) return;
    const trimmed = message.trim();
    if (trimmed === '') return;

    socket.emit('sendDirectMessage', {
      conversationId,
      message: trimmed,
      senderId: currentUser?.id,
      senderNickname: selfDisplayName,
      recipientId: targetUser?.id,
      senderProfileImage: currentUser?.profile_image_url
    });
    setMessage('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleClose = () => {
    resetChatState();
    onClose?.();
  };

  if (!isOpen || !targetUser || !conversationId || !currentUser?.id) {
    return null;
  }

  const isPartnerOnline = participantCount > 1;

  return (
    <div className="direct-chat-overlay" onClick={handleClose}>
      <div className="direct-chat-panel" onClick={(e) => e.stopPropagation()}>
        <div className="direct-chat-header">
          <div className="direct-chat-title">
            <div className="direct-chat-avatar">
              {targetUser?.profile_image_url ? (
                <img src={targetUser.profile_image_url} alt={partnerDisplayName} />
              ) : (
                <span>{partnerInitial}</span>
              )}
            </div>
            <div className="direct-chat-partner">
              <h3>{partnerDisplayName}</h3>
              <p className={isPartnerOnline ? 'online' : 'offline'}>
                {isPartnerOnline ? 'Online now' : 'Waiting for your friend...'}
              </p>
            </div>
          </div>
          <button className="direct-chat-close" onClick={handleClose} aria-label="Close direct chat">
            ×
          </button>
        </div>

        <div className="direct-chat-body">
          {messages.map((entry, index) => {
            const isSystem = entry.type === 'system';
            const isOwnMessage = !isSystem && String(entry.senderId) === String(currentUser?.id);
            const displayName = isSystem
              ? 'System'
              : isOwnMessage
              ? 'You'
              : entry.senderNickname || partnerDisplayName;

            if (isSystem) {
              return (
                <div key={index} className="direct-message-row system">
                  <div className="direct-system-bubble">
                    <span>{entry.message}</span>
                    <span className="direct-system-time">{entry.time}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={index} className={`direct-message-row ${isOwnMessage ? 'own' : 'other'}`}>
                <div className="direct-message-bubble">
                  <div className="direct-message-meta">
                    <span className="direct-sender-name">{displayName}</span>
                    <span className="direct-message-time">{entry.time}</span>
                  </div>
                  <div className="direct-message-text">{entry.message}</div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="direct-chat-input">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${partnerDisplayName}...`}
            rows={1}
          />
          <button onClick={sendMessage} disabled={message.trim() === ''}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default DirectChat;
