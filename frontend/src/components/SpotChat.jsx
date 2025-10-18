import React, { useEffect, useState, useRef } from "react";
import "../styles/SpotChat.css";

export default function SpotChat({ socket, currentSpot, nickname, onClose, isSidebar = false }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [userCount, setUserCount] = useState(1);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (data) => {
      // Only show messages for current spot
      if (data.spotId === currentSpot?.id) {
        setMessages((prev) => [...prev, data]);
      }
    };

    const handleUserCountUpdate = (data) => {
      // Only update count for current spot
      if (data.spotId === currentSpot?.id) {
        setUserCount(data.userCount);
      }
    };

    socket.on("chatMessage", handleChatMessage);
    socket.on("userCountUpdate", handleUserCountUpdate);

    return () => {
      socket.off("chatMessage", handleChatMessage);
      socket.off("userCountUpdate", handleUserCountUpdate);
    };
  }, [socket, currentSpot]);

  const sendMessage = () => {
    if (message.trim() === "" || !socket) return;
    socket.emit("chatMessage", message);
    setMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  if (!currentSpot) {
    return null;
  }

  return (
    <div className={`spot-chat-container ${isSidebar ? 'sidebar-mode' : 'overlay-mode'}`}>
      <div className="spot-chat-header">
        <div className="spot-info">
          <h3>💬 {currentSpot.name} ({userCount})</h3>
          <p>Chat with people at this location</p>
        </div>
        <button className="close-button" onClick={onClose} aria-label="Close chat">
          ×
        </button>
      </div>
      
      <div className="spot-messages-container">
        {messages.map((m, i) => (
          <div key={i} className={`spot-message-row ${m.type} ${m.user === nickname ? 'own-message' : ''}`}>
            {m.type === 'system' ? (
              <div className="spot-system-message">
                <span className="spot-system-text">{m.message}</span>
                <span className="spot-message-time">({m.time})</span>
              </div>
            ) : (
              <div className={`spot-user-message ${m.user === nickname ? 'own' : 'other'}`}>
                <div className="spot-user-meta">
                  <span className="spot-user-name">
                    {m.user === nickname ? 'You' : m.user || 'Anonymous'}
                  </span>
                  <span className="spot-message-time">{m.time}</span>
                </div>
                <div className="spot-message-content">{m.message}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="spot-input-row">
        <input
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="spot-message-input"
        />
        <button onClick={sendMessage} className="spot-send-button">
          Send
        </button>
      </div>
    </div>
  );
}
