import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import "./ChatRoom.css";

const socket = io("http://localhost:4001");

export default function ChatRoom() {
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // Get nickname from user profile on component mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const userNickname = user.nickname || user.name || 'Anonymous';
        setNickname(userNickname);
        socket.emit('setNickname', userNickname);
        console.log(`🎭 ChatRoom using profile nickname: ${userNickname}`);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setNickname('Anonymous');
        socket.emit('setNickname', 'Anonymous');
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    socket.on("chatMessage", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => socket.off("chatMessage");
  }, []);


  const sendMessage = () => {
    if (message.trim() === "") return;
    socket.emit("chatMessage", message);
    setMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-box">
        <div className="chat-header">
          <h3>💬 BYU Chat Room</h3>
          <span className="user-info">Welcome, {nickname}!</span>
        </div>
        
        <div className="messages-container">
          {messages.map((m, i) => (
            <div key={i} className={`message-row ${m.type} ${m.user === nickname ? 'own-message' : ''}`}>
              {m.type === 'system' ? (
                <div className="system-message">
                  <span className="system-text">{m.message}</span>
                  <span className="message-time">({m.time})</span>
                </div>
              ) : (
                <div className={`user-message ${m.user === nickname ? 'own' : 'other'}`}>
                  {m.user !== nickname && <span className="user-name">{m.user}</span>}
                  <div className="message-content">{m.message}</div>
                  <span className="message-time">({m.time})</span>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-row">
          <input
            type="text"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="message-input"
          />
          <button onClick={sendMessage} className="send-button">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
