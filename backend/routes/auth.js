const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// 허용된 학교와 도메인 매핑
const allowedSchools = {
  'byu': 'byu.edu',
  'byuh': 'byuh.edu', 
  'byui': 'byui.edu'
};

// 이메일 도메인 검증 함수
function validateEmailDomain(email, selectedSchool) {
  if (!selectedSchool || !allowedSchools[selectedSchool]) {
    return { valid: false, message: 'Invalid school selection' };
  }
  
  const emailParts = email.split('@');
  if (emailParts.length !== 2) {
    return { valid: false, message: 'Invalid email format' };
  }
  
  const emailDomain = emailParts[1].toLowerCase();
  const expectedDomain = allowedSchools[selectedSchool];
  
  if (emailDomain !== expectedDomain) {
    return { 
      valid: false, 
      message: `Email must be from ${expectedDomain} for selected school` 
    };
  }
  
  return { valid: true };
}

// 회원가입 (이메일 인증 포함)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, nickname, school } = req.body;

    // 입력 검증
    if (!email || !password || !school || !nickname) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Email, password, nickname, and school are required.' 
      });
    }

    // 닉네임 길이 검증
    if (nickname.length < 2 || nickname.length > 20) {
      return res.status(400).json({ 
        error: 'Invalid nickname',
        message: 'Nickname must be between 2 and 20 characters.' 
      });
    }

    // 닉네임 중복 체크 (Supabase Admin API 사용)
    try {
      console.log('Checking for existing nickname:', nickname);
      const { data: existingNickname, error: nicknameCheckError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
        filter: `raw_user_meta_data->nickname.eq.${nickname}`
      });
      
      console.log('Existing nickname check result:', { existingNickname, nicknameCheckError });
      
      if (nicknameCheckError) {
        console.error('Error checking existing nickname:', nicknameCheckError);
        // 에러가 있지만 회원가입을 계속 진행
      } else if (existingNickname && existingNickname.users && existingNickname.users.length > 0) {
        console.log('Found existing nickname:', existingNickname.users[0]);
        // 닉네임이 이미 존재하는 경우
        return res.status(400).json({ 
          error: 'Nickname already taken',
          message: 'This nickname is already taken. Please choose a different nickname.' 
        });
      } else {
        console.log('No existing nickname found, proceeding with registration');
      }
    } catch (nicknameCheckError) {
      console.error('Error in nickname check:', nicknameCheckError);
      // 닉네임 확인 중 에러가 발생해도 회원가입을 계속 진행
    }

    // 학교-이메일 도메인 검증
    const domainValidation = validateEmailDomain(email, school);
    if (!domainValidation.valid) {
      return res.status(400).json({ 
        error: 'Invalid email domain',
        message: domainValidation.message 
      });
    }

    // 기존 사용자 확인 (Supabase Admin API 사용)
    try {
      console.log('Checking for existing user with email:', email);
      const { data: existingUser, error: checkError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000, // 충분히 큰 수로 설정
        filter: `email.eq.${encodeURIComponent(email)}`
      });
      
      console.log('Existing user check result:', { existingUser, checkError });
      
      if (checkError) {
        console.error('Error checking existing user:', checkError);
        // 에러가 있지만 회원가입을 계속 진행
      } else if (existingUser && existingUser.users && existingUser.users.length > 0) {
        console.log('Found existing user:', existingUser.users[0]);
        // 사용자가 이미 존재하는 경우
        return res.status(400).json({ 
          error: 'Email already registered',
          message: 'This email is already registered. Please use a different email or try logging in.' 
        });
      } else {
        console.log('No existing user found, proceeding with registration');
      }
    } catch (checkError) {
      console.error('Error in user check:', checkError);
      // 사용자 확인 중 에러가 발생해도 회원가입을 계속 진행
      // (Supabase 설정에 따라 다를 수 있음)
    }

    // 비밀번호 강도 검증 (최소 6자)
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Weak password',
        message: 'Password must be at least 6 characters long.' 
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
          nickname: nickname,
          school: school
        }
      }
    });

    // Supabase 응답 디버깅
    console.log('Supabase signUp response:', { data, error });

    if (error) {
      let message = 'Registration failed.';
      // Supabase의 다양한 중복 이메일 에러 메시지 처리
      if (error.message.includes('already registered') || 
          error.message.includes('User already registered') ||
          error.message.includes('already been registered') ||
          error.message.includes('email address is already registered')) {
        message = 'This email is already registered. Please use a different email or try logging in.';
      }
      return res.status(400).json({ 
        error: error.message,
        message: message 
      });
    }

    // 중복 이메일인 경우 Supabase가 성공 응답을 보내지만 user가 null일 수 있음
    if (!data.user) {
      return res.status(400).json({ 
        error: 'Email already registered',
        message: 'This email is already registered. Please use a different email or try logging in.' 
      });
    }

    // 회원가입 성공
    res.status(201).json({
      message: 'Registration completed. Please check your email to verify your account.',
      user: {
        id: data.user.id,
        email: data.user.email,
        email_confirmed: data.user.email_confirmed_at !== null,
        name: name,
        nickname: nickname,
        school: school
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: 'An error occurred during registration.' 
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

    // users 테이블에서 사용자 프로필 정보 가져오기
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('nickname, major, hobby, gender, classes, favorite_foods, bio, profile_image_url')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // 프로필이 없어도 로그인은 성공 처리
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
        name: data.user.user_metadata?.name,
        nickname: userProfile?.nickname || data.user.user_metadata?.nickname,
        school: data.user.user_metadata?.school,
        // 추가 프로필 정보도 포함
        major: userProfile?.major,
        hobby: userProfile?.hobby,
        gender: userProfile?.gender,
        classes: userProfile?.classes,
        favorite_foods: userProfile?.favorite_foods,
        bio: userProfile?.bio,
        profile_image_url: userProfile?.profile_image_url
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

// 프로필 업데이트
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { nickname } = req.body;
    const userId = req.user.id;
    const accessToken = req.headers['authorization']?.split(' ')[1];
    
    console.log('Profile update request:', { userId, nickname, user: req.user });

    // 닉네임 길이 검증
    if (nickname && (nickname.length < 2 || nickname.length > 20)) {
      return res.status(400).json({ 
        error: 'Invalid nickname',
        message: 'Nickname must be between 2 and 20 characters.' 
      });
    }

    // 사용자 토큰으로 Supabase 클라이언트 생성
    const { createClient } = require('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );

    // Supabase에서 사용자 메타데이터 업데이트
    const { data, error } = await userSupabase.auth.updateUser({
      data: {
        nickname: nickname
      }
    });

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(400).json({ 
        error: error.message,
        message: 'Failed to update profile.' 
      });
    }

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: data.user.id,
        email: data.user.email,
        email_confirmed: data.user.email_confirmed_at !== null,
        name: data.user.user_metadata?.name,
        nickname: data.user.user_metadata?.nickname,
        school: data.user.user_metadata?.school
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      error: 'Profile update failed',
      message: 'An error occurred while updating profile.' 
    });
  }
});

// Supabase 연결 테스트
router.get('/test-supabase', async (req, res) => {
  try {
    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', process.env.SUPABASE_URL);
    console.log('Service Key exists:', !!process.env.SUPABASE_SERVICE_KEY);
    
    // 간단한 테스트
    const { data, error } = await supabase.auth.getSession();
    console.log('Supabase test result:', { data, error });
    
    res.json({
      message: 'Supabase connection test',
      url: process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
      testResult: { data, error }
    });
  } catch (error) {
    console.error('Supabase test error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
