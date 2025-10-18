import React, { useState, useEffect } from 'react';
import '../styles/VoteComponent.css';

const VoteComponent = ({ buildingId, buildingName, userLocation, onClose }) => {
  const [voteData, setVoteData] = useState({
    option_a: 0,
    option_b: 0,
    total: 0
  });
  const [userVote, setUserVote] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoursUntilMidnight, setHoursUntilMidnight] = useState(null);

  // Fetch vote data
  const fetchVoteData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fetch building vote results
      const voteResponse = await fetch(`http://localhost:4001/api/votes/building/${buildingId}`, {
        headers
      });
      
      if (voteResponse.ok) {
        const voteResult = await voteResponse.json();
        setVoteData(voteResult.votes);
      }

      // Fetch user vote (only if logged in)
      if (token) {
        const userVoteResponse = await fetch(`http://localhost:4001/api/votes/user/${buildingId}`, {
          headers
        });
        
        if (userVoteResponse.ok) {
          const userVoteResult = await userVoteResponse.json();
          setHasVoted(userVoteResult.hasVoted);
          setUserVote(userVoteResult.vote);
        }
      }
    } catch (err) {
      console.error('Error fetching vote data:', err);
      setError('Failed to fetch vote data.');
    }
  };

  // Real-time vote data update (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchVoteData();
    }, 5000);

    return () => clearInterval(interval);
  }, [buildingId]);

  useEffect(() => {
    fetchVoteData();
  }, [buildingId]);

  // Submit vote
  const handleVote = async (voteOption) => {
    const token = localStorage.getItem('access_token');
    console.log('🗳️  Attempting to vote:', { buildingId, voteOption, hasToken: !!token });
    
    if (!token) {
      console.error('❌ No access token found');
      setError('You must be logged in to vote.');
      return;
    }

    // Check if location is available
    if (!userLocation) {
      setError('Location not available. Please wait for GPS to load.');
      return;
    }

    // Prevent voting if already voted today
    if (hasVoted && hoursUntilMidnight) {
      setError(`You have already voted today. Try again after midnight (in ${hoursUntilMidnight} hours).`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📤 Sending vote request to:', 'http://localhost:4001/api/votes/vote');
      const response = await fetch('http://localhost:4001/api/votes/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          buildingId: buildingId,
          voteOption: voteOption,
          userLatitude: userLocation.lat,
          userLongitude: userLocation.lng
        })
      });

      console.log('📥 Vote response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Vote successful:', result);
        setUserVote(voteOption);
        setHasVoted(true);
        // Fetch updated vote data
        await fetchVoteData();
        
        // Display distance information
        if (result.distance) {
          console.log(`📏 You are ${result.distance}m away from the building`);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Vote failed:', errorData);
        
        // Handle already voted today error
        if (response.status === 403 && errorData.error === 'Already voted today') {
          setHasVoted(true);
          setUserVote(errorData.existingVote);
          setHoursUntilMidnight(errorData.hoursUntilMidnight);
          setError(`🚫 ${errorData.message}`);
        } else if (response.status === 403 && errorData.error === 'Out of range') {
          setError(`🚫 You are out of range! ${errorData.message}`);
        } else {
          setError(errorData.message || 'Failed to submit vote.');
        }
      }
    } catch (err) {
      console.error('❌ Error voting:', err);
      setError('An error occurred while processing vote.');
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (count) => {
    if (voteData.total === 0) return 0;
    return Math.round((count / voteData.total) * 100);
  };

  return (
    <div className="vote-popup-overlay" onClick={onClose}>
      <div className="vote-popup" onClick={(e) => e.stopPropagation()}>
        <div className="vote-header">
          <h3>{buildingName}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="vote-content">
          <div className="vote-question">
            <p>Select your opinion about this building:</p>
            <p className="vote-description">A: Like / B: Dislike</p>
            {hasVoted && userVote && (
              <p className="vote-status" style={{ color: '#10b981', fontWeight: 'bold', marginTop: '10px' }}>
                ✅ You voted today: {userVote.toUpperCase()}
                {hoursUntilMidnight && ` (Next vote after midnight - ${hoursUntilMidnight}h)`}
              </p>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {!userLocation && (
            <div className="info-message" style={{ textAlign: 'center', padding: '10px', color: '#666' }}>
              📍 Getting your location...
            </div>
          )}

          <div className="vote-options">
            <div className="vote-option">
              <button 
                className={`vote-button ${userVote === 'a' ? 'selected' : ''}`}
                onClick={() => handleVote('a')}
                disabled={loading || !userLocation || hasVoted}
              >
                A
              </button>
              <div className="vote-info">
                <span className="vote-label">Like</span>
                <div className="vote-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill option-a" 
                      style={{ width: `${getPercentage(voteData.option_a)}%` }}
                    ></div>
                  </div>
                  <span className="vote-count">{voteData.option_a} votes ({getPercentage(voteData.option_a)}%)</span>
                </div>
              </div>
            </div>

            <div className="vote-option">
              <button 
                className={`vote-button ${userVote === 'b' ? 'selected' : ''}`}
                onClick={() => handleVote('b')}
                disabled={loading || !userLocation || hasVoted}
              >
                B
              </button>
              <div className="vote-info">
                <span className="vote-label">Dislike</span>
                <div className="vote-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill option-b" 
                      style={{ width: `${getPercentage(voteData.option_b)}%` }}
                    ></div>
                  </div>
                  <span className="vote-count">{voteData.option_b} votes ({getPercentage(voteData.option_b)}%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="vote-summary">
            <p>Total votes: {voteData.total}</p>
            <p style={{ fontSize: '0.85em', color: '#666', marginTop: '10px' }}>
              💡 You can vote once per building per day (resets at midnight)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoteComponent;
