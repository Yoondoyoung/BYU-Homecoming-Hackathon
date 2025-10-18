import React, { useState, useEffect } from 'react';
import '../styles/ProfilePage.css';

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    nickname: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // localStorage에서 사용자 정보 가져오기
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setFormData({
          nickname: parsedUser.nickname || ''
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      let response = await fetch('http://localhost:4001/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: formData.nickname
        }),
      });

      // 토큰 만료 시 자동 갱신 시도
      if (response.status === 401) {
        console.log('Token expired, attempting refresh...');
        const refreshResponse = await fetch('http://localhost:4001/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: refreshToken
          }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem('access_token', refreshData.access_token);
          localStorage.setItem('refresh_token', refreshData.refresh_token);
          
          // 새로운 토큰으로 다시 시도
          response = await fetch('http://localhost:4001/api/auth/profile', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${refreshData.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nickname: formData.nickname
            }),
          });
        } else {
          // 리프레시 실패 시 로그인 페이지로 리다이렉트
          localStorage.clear();
          window.location.href = '/login';
          return;
        }
      }

      const data = await response.json();

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        // localStorage 업데이트
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
      } else {
        console.error('Profile update failed:', data);
        setError(data.message || data.error || 'Failed to update profile.');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user) {
    return <div>Loading...</div>;
  }
  return (
    <div className="profile-page">
      <div className="profile-content">
        <div className="profile-header">
          <h2>Profile Settings</h2>
          <p>Manage your account information and preferences</p>
        </div>
        
        <div className="profile-sections">
          <div className="profile-section">
            <h3>Profile Picture</h3>
            <div className="profile-picture-section">
              <div className="current-picture">
                <div className="avatar-large">
                  {user.profile_image ? (
                    <img src={user.profile_image} alt="Profile" />
                  ) : (
                    <div className="avatar-initials-large">
                      {getInitials(user.name || user.nickname)}
                    </div>
                  )}
                </div>
              </div>
              <div className="picture-actions">
                <button className="upload-button">Upload Photo</button>
                <button className="remove-button">Remove Photo</button>
              </div>
            </div>
          </div>
          
          <div className="profile-section">
            <h3>Personal Information</h3>
            <div className="info-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="Enter your full name" defaultValue={user.name || ''} disabled />
              </div>
              <div className="form-group">
                <label>Nickname</label>
                <input 
                  type="text" 
                  name="nickname"
                  placeholder="Enter your nickname" 
                  value={formData.nickname}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="Enter your email" defaultValue={user.email || ''} disabled />
              </div>
              <div className="form-group">
                <label>School</label>
                <select disabled>
                  <option value={user.school || ''}>
                    {user.school === 'byu' ? 'Brigham Young University (Provo)' :
                     user.school === 'byuh' ? 'Brigham Young University Hawaii' :
                     user.school === 'byui' ? 'Brigham Young University Idaho' :
                     'Select your school'}
                  </option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="profile-section">
            <h3>Skills & Interests</h3>
            <div className="skills-section">
              <p>Coming soon: Add your skills and interests for better matching!</p>
            </div>
          </div>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <div className="profile-actions">
          <button className="save-button" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button className="cancel-button" onClick={() => window.location.reload()}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
