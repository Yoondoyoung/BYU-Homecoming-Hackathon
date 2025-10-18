import React, { useState, useEffect } from 'react';
import '../styles/LeaderboardPage.css';

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekStart, setWeekStart] = useState(null);
  const [weekEnd, setWeekEnd] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
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
          {weekStart && weekEnd && (
            <p className="week-range">
              Week of {formatDate(weekStart)} - {formatDate(weekEnd)}
            </p>
          )}
          <p className="leaderboard-description">
            Top voters of the week! Keep voting to climb the ranks.
          </p>
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
            🔄 Refresh
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

