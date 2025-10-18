import React, { useState, useEffect } from 'react';
import '../styles/ProfilePage.css';

const ProfilePage = ({ onUserUpdate }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    nickname: '',
    major: '',
    hobby: [],
    gender: '',
    classes: [],
    favorite_foods: [],
    bio: '',
    profile_image_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      // localStorage에서 토큰 가져오기
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No access token found');
        setLoading(false);
        return;
      }

      // Fetch user profile from our API
      const response = await fetch('http://localhost:4001/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const profileData = await response.json();
        setProfile({
          nickname: profileData.nickname || '',
          major: profileData.major || '',
          hobby: profileData.hobby || [],
          gender: profileData.gender || '',
          classes: profileData.classes || [],
          favorite_foods: profileData.favorite_foods || [],
          bio: profileData.bio || '',
          profile_image_url: profileData.profile_image_url || ''
        });
        setUser(profileData);
      } else {
        console.error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayInputChange = (field, value) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    setProfile(prev => ({
      ...prev,
      [field]: array
    }));
  };

  const handleSave = async () => {
    // 성별 선택 확인
    if (!profile.gender) {
      alert('Please select your gender.');
      setMessage('Gender is required.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      setSaving(true);
      // localStorage에서 토큰 가져오기
      const token = localStorage.getItem('access_token');
      if (!token) {
        setMessage('No access token found');
        return;
      }

      const response = await fetch('http://localhost:4001/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        
        // localStorage의 user 데이터 업데이트
        const currentUserData = localStorage.getItem('user');
        if (currentUserData) {
          try {
            const userData = JSON.parse(currentUserData);
            const updatedUserData = {
              ...userData,
              nickname: updatedProfile.nickname,
              major: updatedProfile.major,
              hobby: updatedProfile.hobby,
              gender: updatedProfile.gender,
              classes: updatedProfile.classes,
              favorite_foods: updatedProfile.favorite_foods,
              bio: updatedProfile.bio,
              profile_image_url: updatedProfile.profile_image_url
            };
            localStorage.setItem('user', JSON.stringify(updatedUserData));
            
            // CommonHeader 업데이트를 위한 콜백 호출
            if (onUserUpdate) {
              onUserUpdate();
            }
          } catch (error) {
            console.error('Error updating localStorage:', error);
          }
        }
        
        setMessage('Profile updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-content">
        <div className="profile-header">
          <h2>Profile Settings</h2>
          <p>Manage your profile information and preferences</p>
        </div>
        
        {message && (
          <div className={`${message.includes('Error') ? 'error-message' : 'success-message'}`}>
            {message}
          </div>
        )}

        <div className="profile-sections">
          <div className="profile-section">
            <h3>Basic Information</h3>
            <div className="info-form">
              <div className="form-group">
                <label htmlFor="nickname">Nickname *</label>
                <input
                  type="text"
                  id="nickname"
                  value={profile.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  placeholder="Enter your nickname"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="major">Major</label>
                <input
                  type="text"
                  id="major"
                  value={profile.major}
                  onChange={(e) => handleInputChange('major', e.target.value)}
                  placeholder="e.g., Computer Science, Business"
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">Gender *</label>
                <select
                  id="gender"
                  value={profile.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="profile_image_url">Profile Image URL</label>
                <input
                  type="url"
                  id="profile_image_url"
                  value={profile.profile_image_url}
                  onChange={(e) => handleInputChange('profile_image_url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Interests & Activities</h3>
            <div className="info-form">
              <div className="form-group">
                <label htmlFor="hobby">Hobbies</label>
                <input
                  type="text"
                  id="hobby"
                  value={profile.hobby.join(', ')}
                  onChange={(e) => handleArrayInputChange('hobby', e.target.value)}
                  placeholder="e.g., Reading, Gaming, Sports (comma separated)"
                />
              </div>

              <div className="form-group">
                <label htmlFor="classes">Current Classes</label>
                <input
                  type="text"
                  id="classes"
                  value={profile.classes.join(', ')}
                  onChange={(e) => handleArrayInputChange('classes', e.target.value)}
                  placeholder="e.g., CS 240, MATH 112, ECON 110 (comma separated)"
                />
              </div>

              <div className="form-group">
                <label htmlFor="favorite_foods">Favorite Foods</label>
                <input
                  type="text"
                  id="favorite_foods"
                  value={profile.favorite_foods.join(', ')}
                  onChange={(e) => handleArrayInputChange('favorite_foods', e.target.value)}
                  placeholder="e.g., Pizza, Sushi, Tacos (comma separated)"
                />
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>About Me</h3>
            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                rows="4"
              />
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button 
            className="save-button" 
            onClick={handleSave} 
            disabled={saving || !profile.nickname.trim()}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default ProfilePage;