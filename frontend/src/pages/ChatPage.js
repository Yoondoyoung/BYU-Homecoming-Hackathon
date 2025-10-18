import React from 'react';
import ChatRoom from '../components/ChatRoom';
import './ChatPage.css';

function ChatPage() {
  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <h1>💬 BYU Chat Room</h1>
        <p>Connect with other students in real-time!</p>
      </div>
      <div className="chat-page-content">
        <ChatRoom />
      </div>
    </div>
  );
}

export default ChatPage;
