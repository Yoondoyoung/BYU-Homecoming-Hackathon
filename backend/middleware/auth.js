const { supabase } = require('../config/supabase');

// JWT 토큰 검증 미들웨어
const authenticateToken = async (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: '인증 토큰이 필요합니다.' 
      });
    }

    // Supabase를 사용하여 토큰 검증
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        message: '유효하지 않거나 만료된 토큰입니다.' 
      });
    }

    // 사용자 정보를 request 객체에 추가
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: '인증 처리 중 오류가 발생했습니다.' 
    });
  }
};

// 이메일 인증 여부 확인 미들웨어
const requireEmailVerified = (req, res, next) => {
  if (!req.user.email_confirmed_at) {
    return res.status(403).json({ 
      error: 'Email not verified',
      message: '이메일 인증이 필요합니다.' 
    });
  }
  next();
};

module.exports = { authenticateToken, requireEmailVerified };

