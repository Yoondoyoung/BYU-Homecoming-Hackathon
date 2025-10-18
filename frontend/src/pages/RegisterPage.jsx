import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/RegisterPage.css';

function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    email: '',
    password: '',
    confirmPassword: '',
    school: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // 학교 옵션과 도메인 매핑
  const schoolOptions = [
    { value: 'byu', label: 'Brigham Young University (Provo)', domain: 'byu.edu' },
    { value: 'byuh', label: 'Brigham Young University Hawaii', domain: 'byuh.edu' },
    { value: 'byui', label: 'Brigham Young University Idaho', domain: 'byui.edu' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    // 비밀번호 길이 확인
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:4001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          nickname: formData.nickname,
          email: formData.email,
          password: formData.password,
          school: formData.school
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 회원가입 성공
        setSuccess('Registration successful! Please check your email to verify your account.');
        setFormData({
          name: '',
          nickname: '',
          email: '',
          password: '',
          confirmPassword: '',
          school: ''
        });
        
        // 3초 후 로그인 페이지로 이동
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1 className="register-title">Sign Up</h1>
        <p className="register-subtitle">Join BYU Homecoming Hackathon</p>
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="school">School</label>
            <select
              id="school"
              name="school"
              value={formData.school}
              onChange={handleChange}
              required
              className="school-select"
            >
              <option value="">Select your school</option>
              {schoolOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="nickname">Nickname</label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              required
              placeholder="Choose a nickname"
              maxLength={20}
            />
            <div className="nickname-hint">
              This will be your display name (max 20 characters)
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder={
                formData.school 
                  ? `Enter your ${schoolOptions.find(s => s.value === formData.school)?.domain} email`
                  : "Select school first"
              }
              disabled={!formData.school}
            />
            {formData.school && (
              <div className="email-hint">
                Must be from {schoolOptions.find(s => s.value === formData.school)?.domain}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password (min 6 characters)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button 
            type="submit" 
            className="register-button"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="register-links">
          <p>Already have an account?</p>
          <Link to="/login" className="link">Sign In</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
