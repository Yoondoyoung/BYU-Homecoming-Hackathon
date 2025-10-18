const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// 회원가입 (이메일 인증 포함)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // 입력 검증
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: '이메일과 비밀번호는 필수입니다.' 
      });
    }

    // 비밀번호 강도 검증 (최소 6자)
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Weak password',
        message: '비밀번호는 최소 6자 이상이어야 합니다.' 
      });
    }

    // Supabase Auth를 사용한 회원가입
    // emailRedirectTo: 이메일 인증 후 리다이렉트될 URL
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL}/email-verified`,
        data: {
          name: name || null,
        }
      }
    });

    if (error) {
      return res.status(400).json({ 
        error: error.message,
        message: '회원가입에 실패했습니다.' 
      });
    }

    // 회원가입 성공
    res.status(201).json({
      message: '회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.',
      user: {
        id: data.user.id,
        email: data.user.email,
        email_confirmed: data.user.email_confirmed_at !== null
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: '회원가입 처리 중 오류가 발생했습니다.' 
    });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 입력 검증
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: '이메일과 비밀번호는 필수입니다.' 
      });
    }

    // Supabase Auth를 사용한 로그인
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ 
        error: error.message,
        message: '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.' 
      });
    }

    // 로그인 성공
    res.json({
      message: '로그인 성공',
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        email_confirmed: data.user.email_confirmed_at !== null,
        name: data.user.user_metadata?.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: '로그인 처리 중 오류가 발생했습니다.' 
    });
  }
});

// 로그아웃
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ 
        error: error.message,
        message: '로그아웃에 실패했습니다.' 
      });
    }

    res.json({ message: '로그아웃되었습니다.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      message: '로그아웃 처리 중 오류가 발생했습니다.' 
    });
  }
});

// 현재 사용자 정보 가져오기
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        email_confirmed: req.user.email_confirmed_at !== null,
        name: req.user.user_metadata?.name,
        created_at: req.user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user info',
      message: '사용자 정보를 가져오는데 실패했습니다.' 
    });
  }
});

// 이메일 인증 재전송
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email required',
        message: '이메일은 필수입니다.' 
      });
    }

    // Supabase를 사용하여 인증 이메일 재전송
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL}/email-verified`
      }
    });

    if (error) {
      return res.status(400).json({ 
        error: error.message,
        message: '인증 이메일 전송에 실패했습니다.' 
      });
    }

    res.json({ 
      message: '인증 이메일이 재전송되었습니다. 이메일을 확인해주세요.' 
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      error: 'Failed to resend verification',
      message: '인증 이메일 재전송 중 오류가 발생했습니다.' 
    });
  }
});

// 비밀번호 재설정 요청
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email required',
        message: '이메일은 필수입니다.' 
      });
    }

    // Supabase를 사용하여 비밀번호 재설정 이메일 전송
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) {
      return res.status(400).json({ 
        error: error.message,
        message: '비밀번호 재설정 이메일 전송에 실패했습니다.' 
      });
    }

    res.json({ 
      message: '비밀번호 재설정 링크가 이메일로 전송되었습니다.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      error: 'Failed to send reset email',
      message: '비밀번호 재설정 이메일 전송 중 오류가 발생했습니다.' 
    });
  }
});

// 비밀번호 업데이트 (재설정)
router.post('/update-password', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ 
        error: 'Password required',
        message: '새 비밀번호는 필수입니다.' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Weak password',
        message: '비밀번호는 최소 6자 이상이어야 합니다.' 
      });
    }

    // Supabase를 사용하여 비밀번호 업데이트
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      return res.status(400).json({ 
        error: error.message,
        message: '비밀번호 변경에 실패했습니다.' 
      });
    }

    res.json({ 
      message: '비밀번호가 성공적으로 변경되었습니다.' 
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ 
      error: 'Failed to update password',
      message: '비밀번호 변경 중 오류가 발생했습니다.' 
    });
  }
});

// 토큰 갱신
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ 
        error: 'Refresh token required',
        message: '리프레시 토큰은 필수입니다.' 
      });
    }

    // Supabase를 사용하여 토큰 갱신
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({ 
        error: error.message,
        message: '토큰 갱신에 실패했습니다.' 
      });
    }

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh token',
      message: '토큰 갱신 중 오류가 발생했습니다.' 
    });
  }
});

module.exports = router;

