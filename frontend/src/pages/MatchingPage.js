import React from 'react';
import './MatchingPage.css';

function MatchingPage() {
  return (
    <div className="matching-page">
      <div className="matching-content">
        <div className="matching-header">
          <h2>Matching System</h2>
          <p>Find your perfect team members for the hackathon!</p>
        </div>
        
        <div className="matching-features">
          <div className="feature-card">
            <h3>🎯 Skill Matching</h3>
            <p>Match with people who have complementary skills</p>
          </div>
          
          <div className="feature-card">
            <h3>👥 Team Formation</h3>
            <p>Create or join teams based on your interests</p>
          </div>
          
          <div className="feature-card">
            <h3>💬 Chat System</h3>
            <p>Communicate with potential team members</p>
          </div>
        </div>
        
        <div className="coming-soon">
          <h3>Coming Soon!</h3>
          <p>Matching features will be implemented here.</p>
        </div>
      </div>
    </div>
  );
}

export default MatchingPage;
