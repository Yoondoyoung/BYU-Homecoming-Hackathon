import React, { useState, useEffect } from 'react';
import '../styles/LeaderboardPage.css';

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekStart, setWeekStart] = useState(null);
  const [weekEnd, setWeekEnd] = useState(null);
  const [buildingColors, setBuildingColors] = useState({
    lightBlue: 0,
    coralOrange: 0,
    warmGray: 0
  });

  useEffect(() => {
    fetchLeaderboard();
    fetchBuildingColors();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchLeaderboard();
      fetchBuildingColors();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:4001/api/votes/leaderboard/weekly');
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboard(data.leaderboard);
      setWeekStart(data.weekStart);
      setWeekEnd(data.weekEnd);
      setError(null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildingColors = async () => {
    try {
      // Fetch all active buildings
      const buildingsRes = await fetch('http://localhost:4001/api/buildings');
      if (!buildingsRes.ok) {
        throw new Error('Failed to fetch buildings');
      }
      const buildings = await buildingsRes.json();

      // Fetch aggregated votes per building
      const votesRes = await fetch('http://localhost:4001/api/votes/all');
      if (!votesRes.ok) {
        throw new Error('Failed to fetch building colors');
      }
      const votesData = await votesRes.json();
      const buildingVotes = votesData.buildingVotes || {};

      let lightBlueCount = 0;
      let coralOrangeCount = 0;
      let warmGrayCount = 0;

      // Count color per building, defaulting to 0 when not present
      buildings.forEach((b) => {
        const votes = buildingVotes[b.id] || { option_a: 0, option_b: 0 };
        const optionA = votes.option_a || 0;
        const optionB = votes.option_b || 0;
        const total = optionA + optionB;

        if (total === 0) {
          warmGrayCount++; // No votes - warm gray
        } else if (optionA === optionB) {
          warmGrayCount++; // Tie - warm gray
        } else if (optionA > optionB) {
          lightBlueCount++; // Option A winning - light blue
        } else {
          coralOrangeCount++; // Option B winning - coral orange
        }
      });

      setBuildingColors({
        lightBlue: lightBlueCount,
        coralOrange: coralOrangeCount,
        warmGray: warmGrayCount
      });
    } catch (err) {
      console.error('Error fetching building colors:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getRankEmoji = (rank) => {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}.`;
    }
  };

  if (loading && leaderboard.length === 0) {
    return (
      <div className="leaderboard-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h1>🏆 Weekly Leaderboard</h1>
          <div className="weekly-subject">
            <h2>📋 Weekly Subject: Do you like MintChocolate?</h2>
          </div>
          {weekStart && weekEnd && (
            <p className="week-range">
              Week of {formatDate(weekStart)} - {formatDate(weekEnd)}
            </p>
          )}
          <p className="leaderboard-description">
            Top voters of the week! Keep voting to climb the ranks.
          </p>
          
          <div className="building-colors-status">
            <h3>🎨 Building Colors Status</h3>
            <div className="color-stats">
              <div className="color-stat">
                <div className="color-indicator light-blue"></div>
                <span>Like Leading: {buildingColors.lightBlue}</span>
              </div>
              <div className="color-stat">
                <div className="color-indicator coral-orange"></div>
                <span>Dislike Leading: {buildingColors.coralOrange}</span>
              </div>
              <div className="color-stat">
                <div className="color-indicator warm-gray"></div>
                <span>Tie/No Votes: {buildingColors.warmGray}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {leaderboard.length === 0 ? (
          <div className="no-data-message">
            <p>🗳️ No votes yet this week!</p>
            <p>Be the first to vote and top the leaderboard.</p>
          </div>
        ) : (
          <div className="leaderboard-list">
            {leaderboard.map((user) => (
              <div 
                key={user.userId} 
                className={`leaderboard-item ${user.rank <= 3 ? 'top-three' : ''}`}
              >
                <div className="rank-badge">
                  <span className="rank-number">{getRankEmoji(user.rank)}</span>
                </div>
                <div className="user-info">
                  <span className="user-nickname">{user.nickname}</span>
                  {user.rank === 1 && (
                    <span className="crown-badge">👑 Champion</span>
                  )}
                </div>
                <div className="vote-count">
                  <span className="vote-number">{user.voteCount}</span>
                  <span className="vote-label">votes</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="leaderboard-footer">
          <button onClick={fetchLeaderboard} className="refresh-button" disabled={loading}>
            Refresh
          </button>
          <p className="footer-note">
            💡 Vote on buildings to earn points and climb the leaderboard!
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;

