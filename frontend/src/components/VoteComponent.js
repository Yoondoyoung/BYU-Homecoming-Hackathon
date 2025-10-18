import React, { useState, useEffect } from 'react';
import './VoteComponent.css';

const VoteComponent = ({ buildingId, buildingName, onClose }) => {
  const [voteData, setVoteData] = useState({
    option_a: 0,
    option_b: 0,
    total: 0
  });
  const [userVote, setUserVote] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 투표 데이터 가져오기
  const fetchVoteData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 건물별 투표 결과 조회
      const voteResponse = await fetch(`http://localhost:4001/api/votes/building/${buildingId}`, {
        headers
      });
      
      if (voteResponse.ok) {
        const voteResult = await voteResponse.json();
        setVoteData(voteResult.votes);
      }

      // 사용자 투표 조회 (로그인한 경우만)
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
      setError('투표 데이터를 가져오는데 실패했습니다.');
    }
  };

  // 실시간 투표 데이터 업데이트 (5초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchVoteData();
    }, 5000);

    return () => clearInterval(interval);
  }, [buildingId]);

  useEffect(() => {
    fetchVoteData();
  }, [buildingId]);

  // 투표하기
  const handleVote = async (voteOption) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('투표하려면 로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:4001/api/votes/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          buildingId: buildingId,
          voteOption: voteOption
        })
      });

      if (response.ok) {
        const result = await response.json();
        setUserVote(voteOption);
        setHasVoted(true);
        // 투표 데이터 다시 가져오기
        await fetchVoteData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || '투표에 실패했습니다.');
      }
    } catch (err) {
      console.error('Error voting:', err);
      setError('투표 처리 중 오류가 발생했습니다.');
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
            <p>이 건물에 대한 의견을 선택해주세요:</p>
            <p className="vote-description">A: 좋아요 / B: 싫어요</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="vote-options">
            <div className="vote-option">
              <button 
                className={`vote-button ${userVote === 'a' ? 'selected' : ''}`}
                onClick={() => handleVote('a')}
                disabled={loading}
              >
                A
              </button>
              <div className="vote-info">
                <span className="vote-label">좋아요</span>
                <div className="vote-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill option-a" 
                      style={{ width: `${getPercentage(voteData.option_a)}%` }}
                    ></div>
                  </div>
                  <span className="vote-count">{voteData.option_a}표 ({getPercentage(voteData.option_a)}%)</span>
                </div>
              </div>
            </div>

            <div className="vote-option">
              <button 
                className={`vote-button ${userVote === 'b' ? 'selected' : ''}`}
                onClick={() => handleVote('b')}
                disabled={loading}
              >
                B
              </button>
              <div className="vote-info">
                <span className="vote-label">싫어요</span>
                <div className="vote-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill option-b" 
                      style={{ width: `${getPercentage(voteData.option_b)}%` }}
                    ></div>
                  </div>
                  <span className="vote-count">{voteData.option_b}표 ({getPercentage(voteData.option_b)}%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="vote-summary">
            <p>총 투표수: {voteData.total}표</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoteComponent;
